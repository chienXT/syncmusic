#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncmusic';

async function setAdminRole(username) {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    const user = await User.findOne({ username });

    if (!user) {
      logger.error(`User "${username}" not found`);
      process.exit(1);
    }

    user.role = 'admin';
    await user.save();

    logger.info(`✓ User "${username}" set to admin role successfully`);
    process.exit(0);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const username = process.argv[2];

if (!username) {
  console.log('Usage: node setAdmin.js <username>');
  console.log('Example: node setAdmin.js admin');
  process.exit(1);
}

setAdminRole(username);
