// Catches errors in routes

const catchError = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  }
};

module.exports = catchError;