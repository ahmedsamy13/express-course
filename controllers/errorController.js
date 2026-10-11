const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const path = err.path === '_id' ? 'id' : err.path;
  return new AppError(`Invalid ${path} : ${err.value}`, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const [field, value] = Object.entries(err.keyValue || {})[0] || [];
  const message = field
    ? `Duplicate value for ${field}: ${value}. Please use another value.`
    : 'Duplicate database field value. Please use another value.';
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors).map((error) => error.message);
  return new AppError(`Invalid input data. ${messages.join('. ')}`, 400);
};

const handleJSONParseError = () =>
  new AppError('Invalid JSON body. Use valid JSON with ordinary spaces.', 400);

const handleError = (err) => {
  if (err.name === 'CastError') return handleCastErrorDB(err);
  if (err.code === 11000) return handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') return handleValidationErrorDB(err);
  if (err.type === 'entity.parse.failed') return handleJSONParseError();
  return err;
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Keep unexpected error details in the server logs.
    console.error('error', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err = handleError(err);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};
