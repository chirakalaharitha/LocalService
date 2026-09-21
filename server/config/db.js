const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? null : 'mongodb://127.0.0.1:27017/localfix');
    
    if (!connStr) {
      throw new Error('FATAL: MONGODB_URI environment variable is required in production.');
    }

    const conn = await mongoose.connect(connStr);
    console.log(`[MongoDB] Connected: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

