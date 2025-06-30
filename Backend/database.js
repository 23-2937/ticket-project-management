require('dotenv').config();
const mongoose = require('mongoose');

// Get MongoDB connection URI from environment variables
//const dbURI = process.env.MONGODB_URI; 
const dbURI = "mongodb://localhost:27017/ticket"
// Check if MONGODB_URI is defined
if (!dbURI) {
    console.error('Error: MONGODB_URI is not defined in your .env file.');
    // Exit the process or handle the error appropriately
    process.exit(1); 
}

mongoose.connect(dbURI)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err.message);
    });

// Optional: Handle Mongoose connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected!');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

module.exports = mongoose; // Export the Mongoose instance
