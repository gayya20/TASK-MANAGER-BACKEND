
  // config/db.js
  const mongoose = require('mongoose');
  const config = require('./default');

  console.log(config.MONGO_URI);
  
  const connectDB = async () => {
    try {
      await mongoose.connect(config.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB Connected...');
    } catch (err) {
      console.error('MongoDB Connection Error:', err.message);
      process.exit(1);
    }
  };
  
  module.exports = connectDB;