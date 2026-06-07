const connectDatabase = require('../config/database');

const initializeMongo = () => {
  connectDatabase();
};

module.exports = { initializeMongo };
