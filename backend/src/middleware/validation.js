const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware
 * Checks for validation errors from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    
    return next(new ValidationError(JSON.stringify(formattedErrors)));
  }
  
  next();
};

module.exports = {
  validate
};
