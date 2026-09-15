const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

module.exports = connectDB;
