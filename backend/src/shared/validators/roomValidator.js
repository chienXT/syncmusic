const Joi = require('joi');
const { ValidationError } = require('../../utils/errors');

const createRoomSchema = Joi.object({
  name: Joi.string().trim().min(3).max(50).required(),
  description: Joi.string().trim().max(200).allow('', null),
  isPrivate: Joi.boolean().default(false),
  maxParticipants: Joi.number().integer().min(2).max(100).default(50),
  tags: Joi.array().items(Joi.string().trim()).default([])
});

const joinRoomSchema = Joi.object({
  inviteCode: Joi.string().trim().required()
});

const validateSchema = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(new ValidationError(error.details.map((detail) => detail.message).join(', ')));
  }
  req.body = value;
  next();
};

module.exports = {
  createRoomSchema,
  joinRoomSchema,
  validateSchema
};
