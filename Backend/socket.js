const Message = require("./models/Message")
let onlineUsers = {}; // Stores online users: { userId: socketId }

const mongoose = require('mongoose');
// Your Express app
const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_chat_db';

mongoose.connect(DB_URI)
.then(() => {
  console.log('MongoDB connected successfully!');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  // Exit the process if DB connection fails critical for app functionality
  process.exit(1);
});
module.exports = (io) => {
    io.on("connection", (socket) => {

        // 🟢 User Connection Handling
        socket.on("user_connected", async (userId) => {
            onlineUsers[userId] = socket.id;
            socket.join(userId); // Assign user to a room named after their userId
        
            // Broadcast the updated online users list
            io.emit("online_users", Object.keys(onlineUsers));
        
            try {
                // Fetch undelivered messages from the database
               const pendingMessages = await Message.find({
                receiver: userId,
                status: 'sent'
                }).sort({ createdAt: 1 });                    
                // Send each pending message to the receiver using the room
                pendingMessages.forEach((msg) => {
                    io.to(userId).emit("receive_message", msg);
                });
        
                // Update messages as delivered if there are any pending
                if (pendingMessages.length > 0) {
                    const messageIds = pendingMessages.map((msg) => msg.id);
                    await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { status: 'delivered' } }
                    );
                }
            } catch (err) {
                console.error("❌ Error updating online status or fetching messages:", err);
            }
        });
        

        // 📩 Send Message
        socket.on("send_message", async ({ receiverId, senderId, message }) => {
            console.log(`Sending message from ${senderId} to ${receiverId}`);
            try {
                const newMessage = new Message({
                receiver: receiverId,
                sender: senderId,
                message: message,
                status: 'sent' 
                });
                await newMessage.save();
        
                console.log("New message inserted");
        
                if (onlineUsers[receiverId]) {
                    newMessage.status = "delivered";
                    newMessage.save();
        
                    await Message.findByIdAndUpdate(newMessage._id, { $set: { status: 'delivered' } });
        
                    console.log("Message delivered to receiver");
        
                    io.to(receiverId).emit("receive_message", newMessage);
                    io.to(senderId).emit("receive_message", newMessage);
                }
        
                io.to(senderId).emit("message_sent", newMessage);
            } catch (err) {
                console.error("❌ Error sending message:", err);
            }
        });
        

        // ✍️ Typing Indicator
        socket.on("typing", ({ receiverId, senderId }) => {
            if (onlineUsers[receiverId]) {
                io.to(receiverId).emit("typing", senderId); // ✅ Emit to receiver's room
            }
        });

        // ✅ Mark Message as Read
        socket.on("message_read", async ({ messageId, senderId }) => {
            try {
               await Message.findByIdAndUpdate(messageId, { $set: { status: 'seen' } });

                // Notify sender that their message was seen
                io.to(senderId).emit("message_seen", { messageId });
            } catch (err) {
                console.error("❌ Error updating message status:", err);
            }
        });

        // 📜 Load Previous Messages
        socket.on("load_messages", async ({ senderId,  }) => {
            try {
               const messages = await Message.find({
                $or: [
                    { sender: senderId},
                    {  receiver: senderId }
                ]
                })
                .sort({ createdAt: 1 })
                .populate('sender', 'name') // Assuming 'User' model and 'name' field
                .lean(); // Use .lean() for plain JavaScript objects
                console.log(messages)
                // Emit messages with sender names
                socket.emit("previous_messages", messages);
            } catch (err) {
                console.error("❌ Error fetching messages:", err);
            }
        });

     // 🔴 User Disconnects
       // Handle disconnect event
   socket.on("disconnect", () => {
    let disconnectedUserId = null;
    // Find the user by matching socket IDs
    Object.keys(onlineUsers).forEach((userId) => {
      if (onlineUsers[userId] === socket.id) {
        disconnectedUserId = userId;
      }
    });

    if (disconnectedUserId) {
      // Delay marking offline to handle refreshes
      setTimeout(() => {
        // Check if the socket id is no longer present in the onlineUsers list
        if (!Object.values(onlineUsers).includes(socket.id)) {
          delete onlineUsers[disconnectedUserId];
          io.emit("online_users", Object.keys(onlineUsers));
        }
      }, 20000); // 20-second delay to prevent immediate offline status on refresh
    }
  });

  // Handle Manual Disconnection
  socket.on("user_disconnected", (userId) => {
    // Remove the user from the online users list
    delete onlineUsers[userId];
    io.emit("online_users", Object.keys(onlineUsers));
  });
});


    
};
