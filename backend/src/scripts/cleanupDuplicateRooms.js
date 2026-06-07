require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/User');

async function cleanupDuplicateRooms() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing in environment variables');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Find hosts that currently have more than one active room.
  const duplicateHosts = await Room.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$host', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (duplicateHosts.length === 0) {
    console.log('No duplicate active rooms found. Nothing to clean.');
    await mongoose.disconnect();
    return;
  }

  let totalDeactivated = 0;

  for (const hostGroup of duplicateHosts) {
    const hostId = hostGroup._id;

    const rooms = await Room.find({ host: hostId, isActive: true })
      .sort({ createdAt: -1, _id: -1 })
      .select('_id name createdAt');

    const roomToKeep = rooms[0];
    const roomsToDeactivate = rooms.slice(1);
    const deactivateIds = roomsToDeactivate.map((room) => room._id);

    if (deactivateIds.length === 0) {
      continue;
    }

    await Room.updateMany(
      { _id: { $in: deactivateIds } },
      { $set: { isActive: false } }
    );

    await User.updateMany(
      { currentRoom: { $in: deactivateIds } },
      { $set: { currentRoom: null, status: 'online' } }
    );

    // Ensure host currentRoom points to the kept room.
    await User.updateOne(
      { _id: hostId },
      { $set: { currentRoom: roomToKeep._id, status: 'listening' } }
    );

    totalDeactivated += deactivateIds.length;
    console.log(
      `Host ${hostId}: kept room ${roomToKeep._id} (${roomToKeep.name}), deactivated ${deactivateIds.length} old room(s)`
    );
  }

  console.log(`Cleanup complete. Deactivated ${totalDeactivated} duplicate active room(s).`);
  await mongoose.disconnect();
}

cleanupDuplicateRooms()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Cleanup failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  });
