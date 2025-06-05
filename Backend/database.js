require('dotenv').config();

const mysql = require('mysql2');

const pool = mysql.createPool({
    connectionLimit: 4,
    host: 'localhost',
    user: process.env.DB_USER,
    password: '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0,
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        return;
    }
    console.log('Database connected successfully');
    connection.release();
});

module.exports = pool; // Export the promise-based pool
