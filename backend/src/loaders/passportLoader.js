const passport = require('passport');
require('../config/passport');

const initializePassport = (app) => {
  app.use(passport.initialize());
  app.use(passport.session());
};

module.exports = { initializePassport };
