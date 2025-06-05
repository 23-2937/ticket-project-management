const pool = require("./database");

let onlineUsers = {}; // Stores online users: { userId: socketId }

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
                const [pendingMessages] = await pool.promise().query(
                    "SELECT * FROM messages WHERE receiver_id = ? AND status = 'sent' ORDER BY timestamp ASC",
                    [userId]
                );                      
                // Send each pending message to the receiver using the room
                pendingMessages.forEach((msg) => {
                    io.to(userId).emit("receive_message", msg);
                });
        
                // Update messages as delivered if there are any pending
                if (pendingMessages.length > 0) {
                    const messageIds = pendingMessages.map((msg) => msg.id);
                    await pool.promise().query(
                        "UPDATE messages SET status = 'delivered' WHERE id IN (?)",
                        [messageIds]
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
                const query = "INSERT INTO messages (receiver_id, sender_id, message, status) VALUES (?, ?, ?, 'sent')";
                const [result] = await pool.promise().query(query, [receiverId, senderId, message]);
        
                const newMessage = {
                    id: result.insertId,
                    receiverId,
                    senderId,
                    message,
                    status: "sent",
                    timestamp: new Date(),
                };
        
                console.log("New message inserted:", newMessage);
        
                if (onlineUsers[receiverId]) {
                    newMessage.status = "delivered";
        
                    const updateQuery = "UPDATE messages SET status = 'delivered' WHERE id = ?";
                    await pool.promise().query(updateQuery, [newMessage.id]);
        
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
                await pool.promise().query("UPDATE messages SET status = 'seen' WHERE id = ?", [messageId]);

                // Notify sender that their message was seen
                io.to(senderId).emit("message_seen", { messageId });
            } catch (err) {
                console.error("❌ Error updating message status:", err);
            }
        });

        // 📜 Load Previous Messages
        socket.on("load_messages", async ({ senderId, receiverId }) => {
            try {
                const query = `
                    SELECT m.*, r.name AS sender_name 
                    FROM messages m
                    JOIN registration r ON m.sender_id = r.id
                    WHERE (m.sender_id = ? AND m.receiver_id = ?) 
                       OR (m.sender_id = ? AND m.receiver_id = ?) 
                    ORDER BY m.timestamp ASC
                `;

                const [rows] = await pool.promise().query(query, [senderId, receiverId, receiverId, senderId]);

                // Emit messages with sender names
                socket.emit("previous_messages", rows);
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
