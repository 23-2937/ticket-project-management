require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const route = require('./Routes/route');  // Import auth routes

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST","DELETE","PUT"]
    }
});
const port = process.env.PORT

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Use the auth routes
app.use('/', route);
// socket
require("./socket")(io); 


server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
