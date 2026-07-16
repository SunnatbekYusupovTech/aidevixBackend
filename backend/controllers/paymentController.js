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
  const merchantKey = process.env.PAYME_MERCHANT_KEY;
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

const buildClickSignString = (body) => [
  body.click_trans_id,
  body.service_id,
  process.env.CLICK_SECRET_KEY || '',
  body.merchant_trans_id,
  body.amount,
  body.action,
  body.sign_time,
].join('');

const verifyClickSignature = (req) => {
  const secretKey = process.env.CLICK_SECRET_KEY;
  if (!secretKey) {
    console.error('[click] CLICK_SECRET_KEY o\'rnatilmagan — sign deny'); // FAIL-CLOSED har doim
    return false;
  }

  const providedSign = String(req.body.sign_string || '').toLowerCase();
  if (!providedSign) return false;

  const expectedSign = crypto
    .createHash('md5')
    .update(buildClickSignString(req.body))
    .digest('hex');

  const a = Buffer.from(String(providedSign), 'utf8');
  const e = Buffer.from(String(expectedSign), 'utf8');
  return a.length === e.length && crypto.timingSafeEqual(a, e);
};

const PRO_PRICE_UZS = Number(process.env.PRO_SUBSCRIPTION_PRICE_UZS || 99000);

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
 * Enrollment upsert; studentsCount FAQAT yangi enrollment yaratilganda oshiriladi (rawResult.upserted).
 * Payme/Click retry'da qayta chaqirilsa ham studentsCount ikki marta oshmaydi.
 */
const ensurePaidSideEffects = async (payment, course) => {
  const r = await Enrollment.findOneAndUpdate(
    { userId: payment.userId, courseId: payment.courseId },
    {
      $setOnInsert: { userId: payment.userId, courseId: payment.courseId },
      $set: { paymentStatus: 'paid', paymentId: payment._id },
    },
    { upsert: true, new: true, rawResult: true }
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
    if (provider === 'click' && !process.env.CLICK_SERVICE_ID) {
      return res.status(503).json({ success: false, message: 'To\'lov tizimi sozlanmagan' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    if (course.isFree) return res.status(400).json({ success: false, message: 'Bu kurs bepul' });

    const existing = await Enrollment.findOne({ userId: req.user._id, courseId });
    if (existing && existing.paymentStatus === 'paid')
      return res.status(400).json({ success: false, message: 'Siz bu kursni allaqachon sotib olgansiz' });

    // Mavjud pending to'lovni qaytarish (duplikat oldini olish)
    const pendingPayment = await Payment.findOne({ userId: req.user._id, courseId, status: 'pending' });
    if (pendingPayment) {
      let paymentUrl = null;
      if (pendingPayment.provider === 'payme') {
        const merchantId = process.env.PAYME_MERCHANT_ID;
        const encoded = Buffer.from(`m=${merchantId};ac.order_id=${pendingPayment._id};a=${Math.round(pendingPayment.amount * 100)}`).toString('base64');
        paymentUrl = `https://checkout.paycom.uz/${encoded}`;
      } else if (pendingPayment.provider === 'click') {
        const serviceId = process.env.CLICK_SERVICE_ID;
        paymentUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${serviceId}&amount=${pendingPayment.amount}&transaction_param=${pendingPayment._id}`;
      }
      return res.status(200).json({
        success: true,
        message: 'Mavjud to\'lov',
        data: { payment: { _id: pendingPayment._id, amount: pendingPayment.amount, provider: pendingPayment.provider, status: 'pending' }, paymentUrl },
      });
    }

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
        // Atomik: usedCount++ faqat barcha shartlar bajarilsa (race-safe)
        const promo = await PromoCode.findOneAndUpdate(filter, { $inc: { usedCount: 1 } }, { new: true });
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
      });
    } catch (e) {
      // Payment yaratilmadi — consume qilingan promo'ni qaytaramiz (limitli promo behuda kamaymasin)
      if (consumedPromoId) {
        await PromoCode.findByIdAndUpdate(consumedPromoId, { $inc: { usedCount: -1 } })
          .catch((err) => console.error('[Payment] promo usedCount rollback failed:', err.message));
      }
      throw e;
    }

    let paymentUrl = null;
    if (provider === 'payme') {
      const merchantId = process.env.PAYME_MERCHANT_ID || 'YOUR_MERCHANT_ID';
      const encoded = Buffer.from(`m=${merchantId};ac.order_id=${payment._id};a=${Math.round(finalAmount * 100)}`).toString('base64');
      paymentUrl = `https://checkout.paycom.uz/${encoded}`;
    } else if (provider === 'click') {
      const serviceId = process.env.CLICK_SERVICE_ID || 'YOUR_SERVICE_ID';
      paymentUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${serviceId}&amount=${finalAmount}&transaction_param=${payment._id}`;
    }

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

    // 30 daqiqadan oshgan pending to'lovni expired qilish — atomic (status:'pending' guard)
    if (payment.status === 'pending') {
      const ageMinutes = (Date.now() - payment.createdAt.getTime()) / (1000 * 60);
      if (ageMinutes > 30) {
        const updated = await Payment.findOneAndUpdate(
          { _id: payment._id, status: 'pending' },
          { $set: { status: 'expired', expiredAt: new Date() } },
          { new: true }
        );
        // updated null bo'lsa — boshqa jarayon (webhook) statusni o'zgartirdi, uni saqlaymiz
        if (updated) { payment.status = updated.status; payment.expiredAt = updated.expiredAt; }
      }
    }

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
    if (payment.status === 'cancelled') return { error: { code: -31008, message: 'Tranzaksiya bekor qilingan' }, id };
    return { result: { create_time: payment.paymeCreateTime, transaction: payment._id.toString(), state: 1 }, id };
  }

  // Boshqa Payme txId allaqachon tayinlangan
  if (payment.providerTransactionId && payment.providerTransactionId !== providerTxId) {
    return { error: { code: -31099, message: 'Boshqa tranzaksiya mavjud' }, id };
  }

  payment.providerTransactionId = providerTxId;
  payment.paymeCreateTime = time;
  payment.status = 'pending';
  await payment.save();

  return { result: { create_time: time, transaction: payment._id.toString(), state: 1 }, id };
};

const performTransaction = async (params, id) => {
  const { id: providerTxId } = params;
  const performTime = Date.now();

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
  const existing = await Payment.findOne({ providerTransactionId: providerTxId }).select('status').lean();
  if (!existing) return { error: { code: -31003, message: 'Tranzaksiya topilmadi' }, id };

  // Completed to'lovni bekor qilib bo'lmaydi
  if (existing.status === 'completed') {
    return { error: { code: -31007, message: 'Tranzaksiyani bekor qilib bo\'lmaydi' }, id };
  }

  const cancelTime = Date.now();
  // Atomic: faqat completed bo'lmagan holatda bekor qilamiz (concurrent cancel race-safe)
  const payment = await Payment.findOneAndUpdate(
    { providerTransactionId: providerTxId, status: { $ne: 'completed' } },
    { $set: { status: 'cancelled', paymeCancelTime: cancelTime, paymeCancelReason: reason, cancelledAt: new Date() } },
    { new: true }
  );
  if (!payment) {
    return { error: { code: -31007, message: 'Tranzaksiyani bekor qilib bo\'lmaydi' }, id };
  }

  return { result: { transaction: payment._id.toString(), cancel_time: payment.paymeCancelTime, state: -1 }, id };
};

// Payme CheckTransaction (Payme reconciliation uchun majburiy)
const checkTransaction = async (params, id) => {
  const { id: providerTxId } = params;
  const payment = await Payment.findOne({ providerTransactionId: providerTxId }).lean();
  if (!payment) return { error: { code: -31003, message: 'Tranzaksiya topilmadi' }, id };

  const stateMap = { pending: 1, completed: 2, cancelled: -1 };
  const state = stateMap[payment.status] ?? -1;

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
    state:        ({ pending: 1, completed: 2, cancelled: -1 })[p.status] ?? -1,
    reason:       p.paymeCancelReason ?? null,
  }));

  return { result: { transactions }, id };
};

/** @desc  Payme JSON-RPC webhook | @route POST /api/payments/payme | @access Public */
const handlePayme = async (req, res) => {
  if (!verifyPaymeAuth(req)) {
    return res.status(401).json({ error: { code: -32504, message: 'Unauthorized' }, id: req.body?.id || null });
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

    res.json({ click_trans_id: req.body.click_trans_id, merchant_trans_id, error: 0, error_note: 'Success' });
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

    const { merchant_trans_id, click_trans_id, click_paydoc_id, error: clickError } = req.body;
    if (!/^[0-9a-fA-F]{24}$/.test(String(merchant_trans_id || ''))) return res.json({ error: -5, error_note: 'To\'lov topilmadi' });

    // Defense-in-depth: complete bosqichida ham summani qayta tekshiramiz (prepare/complete
    // orasida narx o'zgargan holatlar). Signature allaqachon tekshirilgan — bu qo'shimcha qatlam.
    if (Number(clickError) >= 0) {
      const expected = await Payment.findById(merchant_trans_id).select('amount').lean();
      if (expected && Math.round(expected.amount * 100) !== Math.round(Number(req.body.amount) * 100)) {
        return res.json({ error: -2, error_note: 'Noto\'g\'ri summa' });
      }
    }

    if (Number(clickError) < 0) {
      // Guard: allaqachon completed bo'lgan to'lovni 'failed' ga overwrite qilmaymiz
      await Payment.findOneAndUpdate(
        { _id: merchant_trans_id, status: { $ne: 'completed' } },
        { $set: { status: 'failed' } }
      );
      return res.json({ click_trans_id, merchant_trans_id, error: 0, error_note: 'Cancelled' });
    }

    // Atomic: faqat pending bo'lsa completed ga o'tkaz (idempotency)
    const payment = await Payment.findOneAndUpdate(
      { _id: merchant_trans_id, status: 'pending' },
      { $set: { status: 'completed', paidAt: new Date(), clickTransId: click_trans_id, clickPaydocId: click_paydoc_id, providerTransactionId: click_trans_id } },
      { new: true }
    );

    if (!payment) {
      const existing = await Payment.findById(merchant_trans_id);
      if (!existing) return res.json({ error: -5, error_note: 'To\'lov topilmadi' });
      // Allaqachon completed — idempotent muvaffaqiyat (side-effect'larni ta'minlab)
      if (existing.status === 'completed') {
        const eCourse = await Course.findById(existing.courseId);
        await ensurePaidSideEffects(existing, eCourse);
        return res.json({ click_trans_id, merchant_trans_id, error: 0, error_note: 'Success' });
      }
      return res.json({ error: -9, error_note: 'To\'lovni qayta ishlash mumkin emas' });
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

    res.json({ click_trans_id, merchant_trans_id, error: 0, error_note: 'Success' });
  } catch (err) {
    res.json({ error: -8, error_note: 'Server xatosi' });
  }
};

module.exports = { initiatePayment, getMyPayments, getPaymentStatus, handlePayme, clickPrepare, clickComplete, ensurePaidSideEffects };
