const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    const isLoaded = Boolean(mongoUri);
    const protocol = mongoUri?.includes('://') ? `${mongoUri.split('://')[0]}://` : 'none';

    console.log(`Mongo URI loaded: ${isLoaded ? 'YES' : 'NO'}`);
    console.log(`Mongo URI protocol: ${protocol}`);

    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined in .env');
    }

    if (!mongoUri.startsWith('mongodb+srv://') && !mongoUri.startsWith('mongodb://')) {
      throw new Error('MONGO_URI must be a valid MongoDB connection string starting with mongodb+srv:// or mongodb://');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
