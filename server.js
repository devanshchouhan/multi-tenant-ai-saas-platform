require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/connect');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Establish Database Connection
  await connectDB();

  // Start HTTP Listener
  app.listen(PORT, () => {
    console.log(`SupportHub API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

startServer();
