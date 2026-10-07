const Certificate = require('../models/Certificate');

/** @desc  Mening sertifikatlarim | @route GET /api/certificates/my | @access Private */
const getMyCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find({ userId: req.user._id })
      .populate('courseId', 'title thumbnail category')
      .sort({ issuedAt: -1 });

    res.json({ success: true, data: { certificates: certs } });
  } catch (err) {
    // ADM-10: ichki xato matni mijozga qaytarilmaydi
    console.error('[certificateController] getMyCertificates:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

/** @desc  Sertifikatni code bo'yicha tekshirish (ochiq) | @route GET /api/certificates/verify/:code | @access Public */
const verifyCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findOne({ certificateCode: req.params.code })
      .populate('userId', 'username')
      .populate('courseId', 'title category');

    if (!cert)
      return res.status(404).json({ success: false, message: 'Sertifikat topilmadi yoki noto\'g\'ri kod' });

    res.json({
      success: true,
      data: {
        valid: true,
        recipientName: cert.recipientName,
        courseName: cert.courseName,
        issuedAt: cert.issuedAt,
        code: cert.certificateCode,
      },
    });
  } catch (err) {
    // ADM-10: ichki xato matni mijozga qaytarilmaydi
    console.error('[certificateController] verifyCertificate:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

/** @desc  PDF yuklab olish | @route GET /api/certificates/:code/download | @access Private */
const downloadCertificate = async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      certificateCode: req.params.code,
      userId: req.user._id,
    })
      .populate('userId', 'username')
      .populate('courseId', 'title');

    if (!cert) return res.status(404).json({ success: false, message: 'Sertifikat topilmadi' });

    // pdfUrl yo'q bo'lsa generate qilish
    if (!cert.pdfUrl) {
      try {
        const { generateCertificatePDF, uploadCertificatePDF } = require('../utils/certificateGenerator');
        const buffer = await generateCertificatePDF(
          cert.recipientName || cert.userId?.username || 'O\'quvchi',
          cert.courseName || cert.courseId?.title || 'Kurs',
          cert.issuedAt || cert.createdAt,
          cert.certificateCode,
        );
        const url = await uploadCertificatePDF(buffer, cert.certificateCode);
        cert.pdfUrl = url;
        await cert.save();
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr.message);
        return res.status(500).json({ success: false, message: 'PDF yaratishda xato' });
      }
    }

    res.json({ success: true, data: { downloadUrl: cert.pdfUrl } });
  } catch (err) {
    // ADM-10: ichki xato matni mijozga qaytarilmaydi
    console.error('[certificateController] downloadCertificate:', err.message);
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

module.exports = { getMyCertificates, verifyCertificate, downloadCertificate };
