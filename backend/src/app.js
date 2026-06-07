require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const path = require('path');
const { initializeExpress } = require('./loaders/expressLoader');
const { initializeMongo } = require('./loaders/mongoLoader');
const logger = require('./utils/logger');

const app = express();

initializeMongo();
initializeExpress(app);

module.exports = app;
