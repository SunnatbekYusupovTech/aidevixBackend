const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');
const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(err.message, {
    name:   err.name,
    path:   req.originalUrl,
    method: req.method,
    status: err.statusCode || 500,
    // Stack faqat serverga (logger), hech qachon client'ga emas.
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  if (err.name === 'CastError') {
    // err.value clientga qaytarilmasin (ID enumeration / info leakage himoyasi)
    error = new ErrorResponse('Resource not found', 404);
  }

  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  if (err.name === 'ValidationError') {
    const message = err.errors
      ? Object.values(err.errors).map((val) => val.message).join(', ')
      : err.message;
    error = new ErrorResponse(message, 400);
  }

  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('Not authorized to access this route', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Session expired, please login again', 401);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ErrorResponse('Fayl hajmi juda katta. Avatar uchun maksimal 2MB.', 400);
    } else {
      error = new ErrorResponse(err.message || 'Fayl yuklashda xatolik.', 400);
    }
  }

  // Cloudinary/multipart runtime errors should be returned as client-facing 400
  if (
    !error.statusCode &&
    typeof err.message === 'string' &&
    (
      err.message.includes('Invalid image file') ||
      err.message.includes('Unsupported source URL') ||
      err.message.includes('File size too large') ||
      err.message.includes('allowed formats')
    )
  ) {
    error = new ErrorResponse(err.message, 400);
  }

  // Stack trace clientga hech qachon qaytarilmaydi — debug uchun loglarda.
  // Production'da `error.message` ham generic bo'lishi kerak agar statusCode 500 bo'lsa.
  const status = error.statusCode || 500;
  const isInternal = status >= 500;
  const safeMessage = isInternal && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : (error.message || 'Internal Server Error');

  res.status(status).json({
    success: false,
    message: safeMessage,
  });
};

module.exports = errorHandler;
