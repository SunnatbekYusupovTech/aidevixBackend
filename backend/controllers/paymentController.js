const Payment    = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course     = require('../models/Course');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const crypto = require('crypto');

/**
 * To'lov tizimi — Payme va Click
 * PAYME_MERCHANT_ID, CLICK_SERVICE_ID, CLICK_SECRET_KEY env o'zgaruvchilarini to'ldiring
 */

const verifyPaymeAuth = (req) => {
  // PAYME_MERCHANT_KEY asosiy nom; PAYME_SECRET_KEY — eski .env.example nomi (D33)
  const merchantKey = process.env.PAYME_MERCHANT_KEY || process.env.PAYME_SECRET_KEY;
  if (!merchantKey) {
    console.error('[payme] PAYME_MERCHANT_KEY o\'rnatilmagan — auth deny'); // FAIL-CLOSED har doim
    return false;
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Basic ')) return false;

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const idx = credentials.indexOf(':');
  const login = idx === -1 ? credentials : credentials.slice(0, idx);
  const password = idx === -1 ? '' : credentials.slice(idx + 1);

  const pwBuf = Buffer.from(password);
  const keyBuf = Buffer.from(merchantKey);
  return login === 'Paycom' && pwBuf.length === keyBuf.length && crypto.timingSafeEqual(pwBuf, keyBuf);
};

/**
 * Click SHOP-API sign string:
 *  Prepare  (action=0): click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time
 *  Complete (action=1): click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time
 */
const buildClickSignString = (body, secretKey = process.env.CLICK_SECRET_KEY || '') => {
  const parts = [body.click_trans_id, body.service_id, secretKey, body.merchant_trans_id];
  if (Number(body.action) === 1) parts.push(body.merchant_prepare_id);
  parts.push(body.amount, body.action, body.sign_time);
  return parts.map((p) => (p === undefined || p === null ? '' : String(p))).join('');
};

const verifyClickSignature = (req) => {
  const secretKey = process.env.CLICK_SECRET_KEY;
  if (!secretKey) {
    console.error('[click] CLICK_SECRET_KEY o\'rnatilmagan — sign deny'); // FAIL-CLOSED har doim
    return false;
  }
  // Boshqa servis uchun imzolangan so'rovni qabul qilmaymiz
  if (process.env.CLICK_SERVICE_ID && String(req.body.service_id) !== String(process.env.CLICK_SERVICE_ID)) return false;

  const providedSign = String(req.body.sign_string || '').toLowerCase();
  if (!providedSign) return false;

  const expectedSign = crypto
    .createHash('md5')
    .update(buildClickSignString(req.body, secretKey))
    .digest('hex');

  const a = Buffer.from(String(providedSign), 'utf8');
  const e = Buffer.from(String(expectedSign), 'utf8');
  return a.length === e.length && crypto.timingSafeEqual(a, e);
};

const PRO_PRICE_UZS = Number(process.env.PRO_SUBSCRIPTION_PRICE_UZS || 99000);

// Payme: state=1 tranzaksiya 12 soatdan keyin bekor qilinadi (reason 4) — Merchant API talabi
const PAYME_TX_TIMEOUT_MS = 43_200_000;
const isPaymeTxExpired = (createTime, now = Date.now()) =>
  Number.isFinite(Number(createTime)) && Number(createTime) > 0 && now - Number(createTime) > PAYME_TX_TIMEOUT_MS;

// Provayder tranzaksiyasi boshlanmagan pending to'lovning ichki yaroqlilik muddati
const PENDING_TTL_MS = 30 * 60 * 1000;

// Payme state: 1 yaratilgan, 2 bajarilgan, -1 perform'dan oldin bekor, -2 perform'dan keyin bekor
const paymeStateOf = (p) => {
  if (p.status === 'pending') return 1;
  if (p.status === 'completed') return 2;
  return p.paymePerformTime ? -2 : -1;
};

/** Promo rezervatsiyasini qaytarish (usedCount-- va user'ni redeemedBy'dan chiqarish). */
const releasePromo = (promoId, userId) => PromoCode.updateOne(
  { _id: promoId, redeemedBy: userId, usedCount: { $gt: 0 } },
  { $inc: { usedCount: -1 }, $pull: { redeemedBy: userId } }
);

/**
 * To'lov expire/cancel/fail bo'lganda uning promo rezervatsiyasini BIR MARTA qaytaradi
 * (promoReleased flag atomik o'rnatiladi — qayta chaqiruv no-op). Xato to'lov oqimini to'xtatmaydi.
 */
const releasePaymentPromo = async (paymentId) => {
  try {
    const p = await Payment.findOneAndUpdate(
      { _id: paymentId, promoCodeId: { $ne: null }, promoReleased: { $ne: true } },
      { $set: { promoReleased: true } },
      { new: true }
    );
    if (p) await releasePromo(p.promoCodeId, p.userId);
  } catch (err) {
    console.error('[Payment] promo release failed:', err.message);
  }
};

/**
 * 30 daqiqadan oshgan pending to'lovni expired qiladi — FAQAT provayder tranzaksiyasi
 * boshlanmagan bo'lsa (Payme CreateTransaction / Click Prepare bo'lmagan). Jonli tranzaksiyani
 * Payme timeout (12h) yoki CancelTransaction / Click error<0 yakunlaydi (D16).
 * @returns expired hujjat yoki null (holat o'zgarmadi)
 */
const expireIfStale = async (payment) => {
  if (!payment || payment.status !== 'pending') return null;
  if (Date.now() - new Date(payment.createdAt).getTime() <= PENDING_TTL_MS) return null;
  const expired = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'pending', providerTransactionId: null, clickPrepareId: null },
    { $set: { status: 'expired', expiredAt: new Date() } },
    { new: true }
  );
  if (expired) await releasePaymentPromo(expired._id);
  return expired;
};

const buildPaymentUrl = (payment) => {
  if (payment.provider === 'payme') {
    const encoded = Buffer.from(`m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${payment._id};a=${Math.round(payment.amount * 100)}`).toString('base64');
    return `https://checkout.paycom.uz/${encoded}`;
  }
  if (payment.provider === 'click') {
    // Click: service_id = CLICK_SERVICE_ID, merchant_id = CLICK_MERCHANT_ID (ular odatda farq qiladi, D15)
    const params = new URLSearchParams({
      service_id: String(process.env.CLICK_SERVICE_ID),
      merchant_id: String(process.env.CLICK_MERCHANT_ID),
      amount: String(payment.amount),
      transaction_param: String(payment._id),
    });
    return `https://my.click.uz/services/pay?${params.toString()}`;
  }
  return null;
};

const pendingPaymentResponse = (res, p) => res.status(200).json({
  success: true,
  message: 'Mavjud to\'lov',
  data: { payment: { _id: p._id, amount: p.amount, provider: p.provider, status: 'pending' }, paymentUrl: buildPaymentUrl(p) },
});

const maybeGrantProSubscription = async (payment, course) => {
  if (!payment || !course) return;
  const isAiCourse = course.category === 'ai';
  const isEnoughAmount = Number(payment.amount || 0) >= PRO_PRICE_UZS;
  if (!isAiCourse || !isEnoughAmount) return;

  // Atomic + idempotent: bitta query. Agar shu payment allaqachon pro bergan bo'lsa
  // (sourcePaymentId === payment._id) — hech qaysi doc mos kelmaydi, no-op.
  await User.findOneAndUpdate(
    { _id: payment.userId, 'proSubscription.sourcePaymentId': { $ne: payment._id } },
    {
      $set: {
        'proSubscription.active': true,
        'proSubscription.plan': 'ai_pro',
        'proSubscription.amount': Number(payment.amount || 0),
        'proSubscription.purchasedAt': new Date(),
        'proSubscription.expiresAt': null,
        'proSubscription.sourcePaymentId': payment._id,
      },
    }
  );
};

/**
 * To'lov "completed" bo'lgach bajarilishi kerak bo'lgan side-effect'lar — IDEMPOTENT.
 * Enrollment upsert; studentsCount FAQAT yangi enrollment yaratilganda oshiriladi (lastErrorObject.upserted).
 * Payme/Click retry'da qayta chaqirilsa ham studentsCount ikki marta oshmaydi.
 * Mongoose 8: `rawResult` olib tashlangan — `includeResultMetadata` ishlatiladi (D17).
 */
const ensurePaidSideEffects = async (payment, course) => {
  const r = await Enrollment.findOneAndUpdate(
    { userId: payment.userId, courseId: payment.courseId },
    {
      $setOnInsert: { userId: payment.userId, courseId: payment.courseId },
      $set: { paymentStatus: 'paid', paymentId: payment._id },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (r?.lastErrorObject?.upserted) {
    await Course.findByIdAndUpdate(payment.courseId, { $inc: { studentsCount: 1 } });
  }
  await maybeGrantProSubscription(payment, course);
};

/** @desc  To'lovni boshlash | @route POST /api/payments/initiate | @access Private */
const initiatePayment = async (req, res) => {
  try {
    const { courseId, provider = 'payme' } = req.body;
    if (!courseId) return res.status(400).json({ success: false, message: 'courseId majburiy' });

    if (!['payme', 'click'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Noto\'g\'ri to\'lov tizimi' });
    }
    if (provider === 'payme' && !process.env.PAYME_MERCHANT_ID) {
      return res.status(503).json({ success: false, message: 'To\'lov tizimi sozlanmagan' });
    }
    if (provider === 'click' && (!process.env.CLICK_SERVICE_ID || !process.env.CLICK_MERCHANT_ID)) {
      return res.status(503).json({ success: false, message: 'To\'lov tizimi sozlanmagan' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    if (course.isFree) return res.status(400).json({ success: false, message: 'Bu kurs bepul' });

    const existing = await Enrollment.findOne({ userId: req.user._id, courseId });
    if (existing && existing.paymentStatus === 'paid')
      return res.status(400).json({ success: false, message: 'Siz bu kursni allaqachon sotib olgansiz' });

    // Mavjud (muddati o'tmagan) pending to'lovni qaytarish (duplikat oldini olish).
    // Eskirgan (30 daq+, provayder tranzaksiyasisiz) pending expired qilinadi va promo qaytariladi.
    let pendingPayment = await Payment.findOne({ userId: req.user._id, courseId, status: 'pending' });
    if (pendingPayment && Date.now() - new Date(pendingPayment.createdAt).getTime() > PENDING_TTL_MS) {
      pendingPayment = (await expireIfStale(pendingPayment))
        ? null // expired + promo qaytarildi — yangi to'lov yaratamiz
        : await Payment.findOne({ _id: pendingPayment._id, status: 'pending' }); // jonli tranzaksiya / parallel o'zgarish
    }
    if (pendingPayment) return pendingPaymentResponse(res, pendingPayment);

    // ── Promo kod (atomik consume, server-side discount) ──────────────────────
    // Narx HAR DOIM serverda hisoblanadi; client amount ishlatilmaydi.
    let finalAmount = course.price;
    let appliedPromo = null;
    let consumedPromoId = null; // Payment.create xato qilsa usedCount'ni qaytarish uchun
    const rawPromo = (req.body.promoCode || '').toString().toUpperCase().trim();
    if (rawPromo) {
      const now = new Date();
      const filter = {
        code: rawPromo,
        isActive: true,
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        ],
      };
      // courseIds scope: promo aniq kurslarga bog'langan bo'lsa, so'ralayotgan courseId ichida bo'lishi shart
      const candidate = await PromoCode.findOne({ code: rawPromo }).select('courseIds').lean();
      const scopedToOther =
        candidate && Array.isArray(candidate.courseIds) && candidate.courseIds.length > 0 &&
        !candidate.courseIds.some(cid => String(cid) === String(courseId));

      if (!scopedToOther) {
        // Atomik courseIds scope tekshiruvi: agar promo aniq kurslarga bog'liq bo'lsa,
        // o'sha shartni atomic filter'ga kiritamiz (TOCTOU race fix).
        // bo'sh/yo'q courseIds = barcha kurslarga amal qiladi (semantika saqlanadi).
        if (candidate && Array.isArray(candidate.courseIds) && candidate.courseIds.length > 0) {
          filter.courseIds = courseId;
        }
        // Bir user bitta promo'ni faqat bir marta band qiladi/ishlatadi (PAY-04 / D18)
        filter.redeemedBy = { $ne: req.user._id };
        // Atomik: usedCount++ va redeemedBy += user faqat barcha shartlar bajarilsa (race-safe).
        // Rezervatsiya to'lov expire/cancel/fail bo'lganda releasePaymentPromo orqali qaytariladi.
        const promo = await PromoCode.findOneAndUpdate(
          filter,
          { $inc: { usedCount: 1 }, $addToSet: { redeemedBy: req.user._id } },
          { new: true }
        );
        if (promo) {
          consumedPromoId = promo._id;
          let discounted = course.price;
          if (promo.type === 'percent') {
            discounted = course.price - (course.price * promo.value) / 100;
          } else { // 'fixed'
            discounted = course.price - promo.value;
          }
          finalAmount = Math.max(1, Math.round(discounted)); // manfiy/0 bo'lmasin, min 1
          appliedPromo = { code: promo.code, type: promo.type, value: promo.value };
        }
        // promo null bo'lsa (limit/expire/inactive) — e'tiborsiz qoldir, original narxda davom et
      }
      // scopedToOther bo'lsa — consume QILMA, original narxda davom et
    }

    let payment;
    try {
      payment = await Payment.create({
        userId: req.user._id,
        courseId,
        amount: finalAmount,
        provider,
        status: 'pending',
        promoCodeId: consumedPromoId,
      });
    } catch (e) {
      // Payment yaratilmadi — consume qilingan promo'ni qaytaramiz (limitli promo behuda kamaymasin)
      if (consumedPromoId) {
        await releasePromo(consumedPromoId, req.user._id)
          .catch((err) => console.error('[Payment] promo usedCount rollback failed:', err.message));
      }
      // Parallel initiate (uniq_pending_user_course): g'olib yaratgan pending to'lovni qaytaramiz (D26)
      if (e && e.code === 11000) {
        const winner = await Payment.findOne({ userId: req.user._id, courseId, status: 'pending' });
        if (winner) return pendingPaymentResponse(res, winner);
      }
      throw e;
    }

    const paymentUrl = buildPaymentUrl(payment);

    res.status(201).json({
      success: true,
      message: 'To\'lov boshlandi',
      data: { payment: { _id: payment._id, amount: payment.amount, provider, status: 'pending' }, paymentUrl, promo: appliedPromo },
    });
  } catch (err) {
    console.error('[payment:initiatePayment]', err);
    res.status(500).json({ success: false, message: 'To\'lov tizimida xato. Qayta urinib ko\'ring.' });
  }
};

/** @desc  To'lov tarixi | @route GET /api/payments/my | @access Private */
const getMyPayments = async (req, res) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const [payments, total] = await Promise.all([
      Payment.find({ userId: req.user._id })
        .populate('courseId', 'title thumbnail')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('[payment:getMyPayments]', err);
    res.status(500).json({ success: false, message: 'To\'lov tarixini olishda xato. Qayta urinib ko\'ring.' });
  }
};

/** @desc  To'lov holatini tekshirish | @route GET /api/payments/:id/status | @access Private */
const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('courseId', 'title price');
    if (!payment) return res.status(404).json({ success: false, message: 'To\'lov topilmadi' });

    // 30 daqiqadan oshgan pending to'lovni expired qilish — atomic (status:'pending' guard),
    // faqat provayder tranzaksiyasi boshlanmagan bo'lsa; promo rezervatsiyasi qaytariladi.
    // null bo'lsa — yosh / jonli tranzaksiya / boshqa jarayon statusni o'zgartirgan.
    const updated = await expireIfStale(payment);
    if (updated) { payment.status = updated.status; payment.expiredAt = updated.expiredAt; }

    res.json({ success: true, data: { payment } });
  } catch (err) {
    console.error('[payment:getPaymentStatus]', err);
    res.status(500).json({ success: false, message: 'To\'lov holatini tekshirishda xato. Qayta urinib ko\'ring.' });
  }
};

// ─── Payme metodlari ──────────────────────────────────────────────────────────

// Yaroqsiz order_id (24-hex bo'lmagan) Mongoose CastError tashlaydi va handlePayme
// uni -31008 (Internal error) qiladi. Payme spec/sandbox bunday holatda -31050
// (account topilmadi) kutadi — shuning uchun format tekshiruvini oldinroq bajaramiz.
const isValidOrderId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ''));

const checkPerformTransaction = async (params, id) => {
  const { account, amount } = params;
  if (!isValidOrderId(account?.order_id)) return { error: { code: -31050, message: 'To\'lov topilmadi' }, id };
  const payment = await Payment.findOne({ _id: account?.order_id, status: 'pending' });
  if (!payment) return { error: { code: -31050, message: 'To\'lov topilmadi' }, id };
  if (Math.round(payment.amount * 100) !== Number(amount)) return { error: { code: -31001, message: 'Noto\'g\'ri summa' }, id };
  return { result: { allow: true }, id };
};

const createPaymeTransaction = async (params, id) => {
  const { id: providerTxId, time, amount, account } = params;
  if (!isValidOrderId(account?.order_id)) return { error: { code: -31050, message: 'To\'lov topilmadi' }, id };
  const payment = await Payment.findById(account?.order_id);
  if (!payment) return { error: { code: -31050, message: 'To\'lov topilmadi' }, id };
  if (Math.round(payment.amount * 100) !== Number(amount)) return { error: { code: -31001, message: 'Noto\'g\'ri summa' }, id };

  // Idempotency: bir xil Payme txId bilan qayta kelgan
  if (payment.providerTransactionId === providerTxId) {
    // state != 1 (bajarilgan/bekor qilingan) -> -31008 (Merchant API)
    if (payment.status !== 'pending') return { error: { code: -31008, message: 'Tranzaksiyani bajarib bo\'lmaydi' }, id };
    if (isPaymeTxExpired(payment.paymeCreateTime)) {
      await cancelPaymeTimedOut(payment);
      return { error: { code: -31008, message: 'Tranzaksiya muddati tugagan' }, id };
    }
    return { result: { create_time: payment.paymeCreateTime, transaction: payment._id.toString(), state: 1 }, id };
  }

  // Boshqa Payme txId allaqachon tayinlangan — buyurtma band
  if (payment.providerTransactionId) {
    return { error: { code: -31099, message: 'Boshqa tranzaksiya mavjud' }, id };
  }

  // Faqat pending buyurtma uchun tranzaksiya ochiladi (expired/failed/cancelled qayta tiriltirilmaydi — D07)
  if (payment.status !== 'pending') return { error: { code: -31050, message: 'To\'lov topilmadi' }, id };

  // Atomik: faqat hali tranzaksiyasi yo'q pending buyurtmaga biriktiramiz (parallel Create race — D12)
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'pending', providerTransactionId: null },
    { $set: { providerTransactionId: providerTxId, paymeCreateTime: time } },
    { new: true }
  );
  if (!updated) {
    const again = await Payment.findById(payment._id).lean();
    if (again && again.providerTransactionId === providerTxId && again.status === 'pending') {
      return { result: { create_time: again.paymeCreateTime, transaction: again._id.toString(), state: 1 }, id };
    }
    if (again && again.providerTransactionId) return { error: { code: -31099, message: 'Boshqa tranzaksiya mavjud' }, id };
    return { error: { code: -31050, message: 'To\'lov topilmadi' }, id };
  }

  return { result: { create_time: time, transaction: updated._id.toString(), state: 1 }, id };
};

/** Payme 12h timeout: state=1 tranzaksiyani reason 4 bilan bekor qiladi (atomik, promo qaytariladi). */
const cancelPaymeTimedOut = async (payment) => {
  const cancelled = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'pending' },
    { $set: { status: 'cancelled', paymeCancelTime: Date.now(), paymeCancelReason: 4, cancelledAt: new Date() } },
    { new: true }
  );
  if (cancelled) await releasePaymentPromo(cancelled._id);
  return cancelled;
};

const performTransaction = async (params, id) => {
  const { id: providerTxId } = params;
  const performTime = Date.now();

  // 12h timeout: muddati o'tgan state=1 tranzaksiya bajarilmaydi — reason 4 bilan bekor (D06)
  const current = await Payment.findOne({ providerTransactionId: providerTxId, status: 'pending' }).select('_id paymeCreateTime').lean();
  if (current && isPaymeTxExpired(current.paymeCreateTime)) {
    await cancelPaymeTimedOut(current);
    return { error: { code: -31008, message: 'Tranzaksiya muddati tugagan' }, id };
  }

  // Atomic: faqat pending bo'lsa completed ga o'tkaz (race condition oldini olish)
  const payment = await Payment.findOneAndUpdate(
    { providerTransactionId: providerTxId, status: 'pending' },
    { $set: { status: 'completed', paidAt: new Date(), paymePerformTime: performTime } },
    { new: true }
  );

  if (!payment) {
    const existing = await Payment.findOne({ providerTransactionId: providerTxId });
    if (!existing) return { error: { code: -31003, message: 'Tranzaksiya topilmadi' }, id };
    if (existing.status === 'completed') {
      // Payme retry: side-effect'lar (enrollment) ta'minlanganini idempotent kafolatla
      const eCourse = await Course.findById(existing.courseId);
      await ensurePaidSideEffects(existing, eCourse);
      return { result: { transaction: existing._id.toString(), perform_time: existing.paymePerformTime, state: 2 }, id };
    }
    if (existing.status === 'cancelled') {
      return { error: { code: -31008, message: 'Tranzaksiya bekor qilingan' }, id };
    }
    return { error: { code: -31008, message: 'Tranzaksiyani bajarib bo\'lmaydi' }, id };
  }

  const course = await Course.findById(payment.courseId);
  await ensurePaidSideEffects(payment, course);

  // Telegram admin bildirishnoma (Payme)
  try {
    const { getBot } = require('../utils/telegramBot');
    const bot = getBot();
    if (bot) {
        const pUser = await User.findById(payment.userId);
        const pCourse = course || await Course.findById(payment.courseId);
      if (pUser && pCourse) bot.notifyNewPayment(payment, pUser, pCourse);
    }
  } catch (_) {}

  return { result: { transaction: payment._id.toString(), perform_time: performTime, state: 2 }, id };
};

const cancelTransaction = async (params, id) => {
  const { id: providerTxId, reason } = params;
  const cancelledResult = (p) => ({ result: { transaction: p._id.toString(), cancel_time: p.paymeCancelTime ?? 0, state: paymeStateOf(p) }, id });

  const existing = await Payment.findOne({ providerTransactionId: providerTxId }).lean();
  if (!existing) return { error: { code: -31003, message: 'Tranzaksiya topilmadi' }, id };

  // Completed to'lovni bekor qilib bo'lmaydi
  if (existing.status === 'completed') {
    return { error: { code: -31007, message: 'Tranzaksiyani bekor qilib bo\'lmaydi' }, id };
  }
  // Idempotent: allaqachon bekor qilingan — saqlangan cancel_time qaytariladi, qayta yozilmaydi (D10)
  if (existing.status === 'cancelled') return cancelledResult(existing);

  const cancelTime = Date.now();
  // Atomic: faqat completed/cancelled bo'lmagan holatda bekor qilamiz (concurrent cancel race-safe)
  const payment = await Payment.findOneAndUpdate(
    { providerTransactionId: providerTxId, status: { $nin: ['completed', 'cancelled'] } },
    { $set: { status: 'cancelled', paymeCancelTime: cancelTime, paymeCancelReason: reason, cancelledAt: new Date() } },
    { new: true }
  );
  if (!payment) {
    const again = await Payment.findOne({ providerTransactionId: providerTxId }).lean();
    if (again && again.status === 'cancelled') return cancelledResult(again);
    return { error: { code: -31007, message: 'Tranzaksiyani bekor qilib bo\'lmaydi' }, id };
  }
  await releasePaymentPromo(payment._id);

  return cancelledResult(payment);
};

// Payme CheckTransaction (Payme reconciliation uchun majburiy)
const checkTransaction = async (params, id) => {
  const { id: providerTxId } = params;
  const payment = await Payment.findOne({ providerTransactionId: providerTxId }).lean();
  if (!payment) return { error: { code: -31003, message: 'Tranzaksiya topilmadi' }, id };

  const state = paymeStateOf(payment);

  return {
    result: {
      create_time:  payment.paymeCreateTime  ?? 0,
      perform_time: payment.paymePerformTime ?? 0,
      cancel_time:  payment.paymeCancelTime  ?? 0,
      transaction:  payment._id.toString(),
      state,
      reason: payment.paymeCancelReason ?? null,
    },
    id,
  };
};

// Payme GetStatement (hisobot uchun majburiy)
const getStatement = async (params, id) => {
  const { from, to } = params;
  // Validatsiya: from/to musbat son, oraliq max ~62 kun (Payme spec: ms timestamp)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from || (to - from) > 62 * 24 * 60 * 60 * 1000) {
    return { error: { code: -31050, message: 'Yaroqsiz vaqt oralig\'i' }, id };
  }
  const payments = await Payment.find({
    provider: 'payme',
    providerTransactionId: { $ne: null },
    paymeCreateTime: { $gte: from, $lte: to },
  }).lean();

  const transactions = payments.map(p => ({
    id:           p.providerTransactionId,
    time:         p.paymeCreateTime,
    amount:       Math.round(p.amount * 100),
    account:      { order_id: p._id.toString() },
    create_time:  p.paymeCreateTime  ?? 0,
    perform_time: p.paymePerformTime ?? 0,
    cancel_time:  p.paymeCancelTime  ?? 0,
    transaction:  p._id.toString(),
    state:        paymeStateOf(p),
    reason:       p.paymeCancelReason ?? null,
  }));

  return { result: { transactions }, id };
};

/** @desc  Payme JSON-RPC webhook | @route POST /api/payments/payme | @access Public */
const handlePayme = async (req, res) => {
  if (!verifyPaymeAuth(req)) {
    // Payme JSON-RPC: barcha javoblar HTTP 200, xato faqat error.code orqali (D11)
    return res.status(200).json({ error: { code: -32504, message: 'Unauthorized' }, id: req.body?.id || null });
  }

  const { method, params, id } = req.body;
  try {
    switch (method) {
      case 'CheckPerformTransaction': return res.json(await checkPerformTransaction(params, id));
      case 'CreateTransaction':       return res.json(await createPaymeTransaction(params, id));
      case 'PerformTransaction':      return res.json(await performTransaction(params, id));
      case 'CancelTransaction':       return res.json(await cancelTransaction(params, id));
      case 'CheckTransaction':        return res.json(await checkTransaction(params, id));
      case 'GetStatement':            return res.json(await getStatement(params, id));
      default: return res.json({ error: { code: -32601, message: 'Method not found' }, id });
    }
  } catch (err) {
    console.error('Payme error:', err);
    return res.json({ error: { code: -31008, message: 'Internal error' }, id });
  }
};

// ─── Click metodlari ──────────────────────────────────────────────────────────

/** @desc  Click prepare | @route POST /api/payments/click/prepare | @access Public */
const clickPrepare = async (req, res) => {
  try {
    if (!verifyClickSignature(req)) {
      return res.json({ error: -1, error_note: 'SIGN CHECK FAILED' });
    }

    const { merchant_trans_id, amount, action } = req.body;
    if (Number(action) !== 0) return res.json({ error: -3, error_note: 'Noto\'g\'ri action' });
    if (!/^[0-9a-fA-F]{24}$/.test(String(merchant_trans_id || ''))) return res.json({ error: -5, error_note: 'To\'lov topilmadi' });

    const payment = await Payment.findById(merchant_trans_id).lean();
    if (!payment) return res.json({ error: -5, error_note: 'To\'lov topilmadi' });
    // Summani tiyn (×100) butun sonda solishtiramiz — float yumaloq xatosini oldini olish (Payme bilan mos)
    if (Math.round(payment.amount * 100) !== Math.round(Number(amount) * 100)) return res.json({ error: -2, error_note: 'Noto\'g\'ri summa' });
    if (payment.status === 'completed') return res.json({ error: -4, error_note: 'To\'lov allaqachon yakunlangan' });
    // Bekor qilingan / muddati o'tgan / muvaffaqiyatsiz buyurtma to'lanmaydi (D02)
    if (payment.status !== 'pending') return res.json({ error: -9, error_note: 'Tranzaksiya bekor qilingan' });

    // merchant_prepare_id: Click Complete'da qaytarib yuboradi va imzoga kiradi. Click retry'da bir xil qiymat.
    let prepareId = payment.clickPrepareId;
    if (!prepareId) {
      const updated = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'pending', clickPrepareId: null },
        { $set: { clickPrepareId: crypto.randomInt(1, 2147483647) } },
        { new: true }
      );
      const fresh = updated || await Payment.findById(payment._id).select('status clickPrepareId').lean();
      if (!fresh || fresh.status !== 'pending' || !fresh.clickPrepareId) {
        return res.json({ error: -9, error_note: 'Tranzaksiya bekor qilingan' });
      }
      prepareId = fresh.clickPrepareId;
    }

    res.json({ click_trans_id: req.body.click_trans_id, merchant_trans_id, merchant_prepare_id: prepareId, error: 0, error_note: 'Success' });
  } catch (err) {
    res.json({ error: -8, error_note: 'Server xatosi' });
  }
};

/** @desc  Click complete | @route POST /api/payments/click/complete | @access Public */
const clickComplete = async (req, res) => {
  try {
    if (!verifyClickSignature(req)) {
      return res.json({ error: -1, error_note: 'SIGN CHECK FAILED' });
    }

    const { merchant_trans_id, merchant_prepare_id, click_trans_id, click_paydoc_id, action, error: clickError } = req.body;
    // Complete faqat action=1 (prepare payload'ini replay qilib bo'lmaydi — D13)
    if (Number(action) !== 1) return res.json({ error: -3, error_note: 'Noto\'g\'ri action' });
    // `error` majburiy: yo'q/son bo'lmasa so'rov yaroqsiz (NaN amount tekshiruvini chetlab o'tmasin)
    const clickErr = Number(clickError);
    if (clickError === undefined || clickError === null || String(clickError).trim() === '' || !Number.isFinite(clickErr)) {
      return res.json({ error: -8, error_note: 'Yaroqsiz so\'rov' });
    }
    if (!/^[0-9a-fA-F]{24}$/.test(String(merchant_trans_id || ''))) return res.json({ error: -5, error_note: 'To\'lov topilmadi' });

    const current = await Payment.findById(merchant_trans_id).lean();
    if (!current) return res.json({ error: -5, error_note: 'To\'lov topilmadi' });
    // Complete faqat muvaffaqiyatli Prepare'dan keyin va o'sha merchant_prepare_id bilan
    if (!current.clickPrepareId || String(current.clickPrepareId) !== String(merchant_prepare_id)) {
      return res.json({ error: -6, error_note: 'Tranzaksiya topilmadi' });
    }
    // Summani har doim qayta tekshiramiz (signature bilan birga qo'shimcha qatlam)
    if (Math.round(current.amount * 100) !== Math.round(Number(req.body.amount) * 100)) {
      return res.json({ error: -2, error_note: 'Noto\'g\'ri summa' });
    }
    const confirm = { click_trans_id, merchant_trans_id, merchant_confirm_id: current.clickPrepareId };

    if (clickErr < 0) {
      // Click to'lovni bekor qildi — pending buyurtmani bekor qilamiz (completed'ga tegilmaydi), promo qaytariladi
      const cancelled = await Payment.findOneAndUpdate(
        { _id: merchant_trans_id, status: 'pending' },
        { $set: { status: 'cancelled', cancelledAt: new Date() } },
        { new: true }
      );
      if (cancelled) await releasePaymentPromo(cancelled._id);
      return res.json({ ...confirm, error: -9, error_note: 'Tranzaksiya bekor qilingan' });
    }

    // Atomic: faqat pending bo'lsa completed ga o'tkaz (idempotency)
    const payment = await Payment.findOneAndUpdate(
      { _id: merchant_trans_id, status: 'pending', clickPrepareId: current.clickPrepareId },
      { $set: { status: 'completed', paidAt: new Date(), clickTransId: String(click_trans_id), clickPaydocId: click_paydoc_id, providerTransactionId: String(click_trans_id) } },
      { new: true }
    );

    if (!payment) {
      const existing = await Payment.findById(merchant_trans_id);
      if (!existing) return res.json({ error: -5, error_note: 'To\'lov topilmadi' });
      // Allaqachon completed — idempotent muvaffaqiyat (side-effect'larni ta'minlab)
      if (existing.status === 'completed') {
        const eCourse = await Course.findById(existing.courseId);
        await ensurePaidSideEffects(existing, eCourse);
        return res.json({ ...confirm, error: 0, error_note: 'Success' });
      }
      return res.json({ error: -9, error_note: 'Tranzaksiya bekor qilingan' });
    }

    const course = await Course.findById(payment.courseId);
    await ensurePaidSideEffects(payment, course);

    // Telegram admin bildirishnoma (Click)
    try {
      const { getBot } = require('../utils/telegramBot');
      const bot = getBot();
      if (bot) {
        const cUser = await User.findById(payment.userId);
        const cCourse = course || await Course.findById(payment.courseId);
        if (cUser && cCourse) bot.notifyNewPayment(payment, cUser, cCourse);
      }
    } catch (_) {}

    res.json({ ...confirm, error: 0, error_note: 'Success' });
  } catch (err) {
    res.json({ error: -8, error_note: 'Server xatosi' });
  }
};

module.exports = {
  initiatePayment, getMyPayments, getPaymentStatus, handlePayme, clickPrepare, clickComplete, ensurePaidSideEffects,
  // sof helper'lar — unit testlar uchun
  buildClickSignString, isPaymeTxExpired, PAYME_TX_TIMEOUT_MS,
};
