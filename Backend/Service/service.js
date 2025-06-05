// Importing Required Modules
const pool = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const { useCallback } = require('react');

// Secret Key for JWT Token
const secretKey = process.env.SECRET_KEY;

/***********************
 * User Registration and Authentication
 ***********************/

// Register a new user
const register = async (name, email, password) => {
    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        const [results] = await pool.promise().query(
            "INSERT INTO registration (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );

        return results;
    } catch (err) {
        console.error(err);
        throw new Error('Error registering user');
    }
};

// Authenticate user (login)
const authenticateUser = async (email, password) => {
    try {
        const sql = "SELECT * FROM registration WHERE email = ?";
        const [data] = await pool.promise().query(sql, [email]);

        if (data.length > 0) {
            const user = data[0];

            // 🚨 Check if the user is inactive
            if (user.status !== "active") {
                return { success: false, error: "Your account is inactive. Please contact support." };
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (validPassword) {
                const authToken = jwt.sign(
                    { id: user.id, email: user.email, role: user.role },
                    secretKey,
                    { expiresIn: '10m' }
                );


                return { success: true, user, authToken };
            }
        }
        return { success: false, error: "Invalid email or password." };
    } catch (err) {
        console.error(err);
        throw new Error('Error authenticating user');
    }
};



// Change user password
const changePasswordService = async (authToken, currentPassword, newPassword) => {
    try {
        const decoded = jwt.verify(authToken, '591789@@KELVIN');
        const userId = decoded.id;

        if (!userId) {
            return { status: 401, data: { error: 'Unauthorized: Invalid token payload' } };
        }

        const [userRows] = await pool.promise().query(
            'SELECT password FROM registration WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return { status: 404, data: { error: 'User not found' } };
        }

        const currentPasswordHash = userRows[0].password;

        const isMatch = await bcrypt.compare(currentPassword, currentPasswordHash);
        if (!isMatch) {
            return { status: 400, data: { error: 'Incorrect current password' } };
        }

        const isSamePassword = await bcrypt.compare(newPassword, currentPasswordHash);
        if (isSamePassword) {
            return { status: 400, data: { error: 'New password must be different from the current password' } };
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await pool.promise().query(
            'UPDATE registration SET password = ? WHERE id = ?',
            [newPasswordHash, userId]
        );

        return { status: 200, data: { success: 'Password changed successfully' } };
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return { status: 400, data: { error: 'Invalid token' } };
        } else if (error.name === 'TokenExpiredError') {
            return { status: 401, data: { error: 'Token has expired' } };
        }

        console.error('Error changing password:', error);
        throw new Error('An error occurred while changing the password');
    }
};

/***********************
 * User Profile and Management
 ***********************/

// Get user profile by email
const getUserProfile = async (email) => {
    try {
        const [results] = await pool.promise().query('SELECT * FROM registration WHERE email = ?', [email]);
        return results.length ? results[0] : null;
    } catch (err) {
        console.error(err);
        throw new Error('Error fetching profile');
    }
};

const updateProfileService = async (name, email) => {
    try {
        await pool.promise().query('UPDATE registration SET name = ? WHERE email = ?', [name, email]);
        return { message: 'Profile updated successfully' };
    } catch (err) {
        console.error('Error updating profile:', err);
        throw new Error('An error occurred while updating the profile');
    }
};

// Get users with optional search and role filters
const getUsersService = async (search, role) => {
    try {
        let query = 'SELECT * FROM registration WHERE 1=1';
        if (search) {
            query += ' AND name LIKE ?';
        }
        if (role) {
            query += ' AND role = ?';
        }

        query += ' ORDER BY name ASC';
        const params = [];
        if (search) params.push(`%${search}%`);
        if (role) params.push(role);

        const [rows] = await pool.promise().query(query, params);
        return rows;
    } catch (error) {
        console.error('Error in userService:', error);
        throw new Error('Error fetching users');
    }
};

// Change user role (admin functionality)
const changeRoleService = async (id, role) => {
    const [result] = await pool.promise().query(
        'UPDATE registration SET role = ? WHERE id = ?',
        [role, id]
    );
    return result;
};

// Handle user deactivation (toggle between active/inactive)
const handleDeactivate = async (id) => {
    const [user] = await pool.promise().query('SELECT status FROM registration WHERE id = ?', [id]);

    if (user.length === 0) {
        return null; // User not found
    }

    const newStatus = user[0].status === 'active' ? 'inactive' : 'active';

    const [result] = await pool.promise().query(
        'UPDATE registration SET status = ? WHERE id = ?',
        [newStatus, id]
    );

    if (result.affectedRows === 0) {
        return null; // If the update fails
    }

    return { status: newStatus };
};

// Handle user deletion
const handleDeleteService = async (id) => {
    const [result] = await pool.promise().query(
        'DELETE FROM registration WHERE id = ?',
        [id]
    );
    return result;
};

/***********************
 * Ticket Management
 ***********************/

// Create a new support ticket
const createTicketService = async ({ user_id, assigned_to, title, description, priority }) => {
    try {
        // Insert the ticket into the database
        const [result] = await pool.promise().query(
            'INSERT INTO tickets (user_id, assigned_to, title, description, priority) VALUES (?, ?, ?, ?, ?)',
            [user_id, assigned_to || null, title, description, priority]
        );

        const newTicketId = result.insertId;
        const ticket_number = `T${String(newTicketId).padStart(5, '0')}`;

        // Update the ticket with the generated ticket number
        await pool.promise().query(
            'UPDATE tickets SET ticket_number = ? WHERE id = ?',
            [ticket_number, newTicketId]
        );

        // Fetch the ticket creator's email and status
        const [userResult] = await pool.promise().query(
            'SELECT email FROM registration WHERE id = ?',
            [user_id]
        );

        const [ticketResult] = await pool.promise().query(
            'SELECT status FROM tickets WHERE id = ?',
            [newTicketId]
        );

        if (!userResult.length) {
            throw new Error("User email not found");
        }

        return {
            ticket_number: ticket_number,
            title,
            status: ticketResult[0]?.status || "Pending", // Default status if missing
            user_email: userResult[0].email
        };
    } catch (error) {
        console.error("Database error:", error);
        throw new Error("Failed to create ticket. Please try again.");
    }
};




const uploadBulkyTicketService = async (tickets, userId) => {
    try {
        if (!Array.isArray(tickets) || tickets.length === 0) {
            throw new Error("Invalid ticket data");
        }

        // ✅ Create bulk insert placeholders
        const placeholders = tickets.map(() => "(?, ?, ?, ?, ?)").join(", ");
        const values = tickets.flatMap(({ title, description, priority }) => [
            userId,
            null, // assigned_to (default NULL)
            title,
            description,
            priority || "medium",
        ]);

        // ✅ Insert tickets into the database
        const [result] = await pool.promise().query(
            `INSERT INTO tickets (user_id, assigned_to, title, description, priority) VALUES ${placeholders}`,
            values
        );

        // ✅ Get the range of inserted IDs
        const firstInsertedId = result.insertId;
        const rowCount = result.affectedRows;

        if (!firstInsertedId || rowCount === 0) {
            throw new Error("No tickets were inserted.");
        }

        // ✅ Generate ticket numbers for each inserted row
        const insertedIds = Array.from(
            { length: rowCount },
            (_, i) => firstInsertedId + i
        );

        const updateQueries = insertedIds.map(id => ({
            ticket_number: `T${String(id).padStart(5, "0")}`,
            id,
        }));

        // ✅ Construct batch update query
        const updateQuery = `
            UPDATE tickets
            SET ticket_number = CASE
                ${updateQueries.map(({ id }) => `WHEN id = ${id} THEN ?`).join(" ")}
            END
            WHERE id IN (${insertedIds.join(",")});
        `;

        const updateValues = updateQueries.map(({ ticket_number }) => ticket_number);

        // ✅ Execute batch update
        await pool.promise().query(updateQuery, updateValues);

        return rowCount; // Number of inserted rows
    } catch (error) {
        throw new Error("Database error: " + error.message);
    }
};

const editTicketService = async (ticketNumber, user_id) => {
    try {
        // Update ticket assignment
        const [updateResult] = await pool.promise().query(
            "UPDATE tickets SET assigned_to = ? WHERE ticket_number = ?",
            [user_id, ticketNumber]
        );

        if (updateResult.affectedRows > 0) {
            // Fetch updated ticket details
            const [ticketDetails] = await pool.promise().query(
                `SELECT t.ticket_number, t.title, t.status, t.assigned_to, u.email AS user_email 
                 FROM tickets t 
                 JOIN registration u ON t.assigned_to = u.id 
                 WHERE t.ticket_number = ?`,
                [ticketNumber]
            );        
            
            if (ticketDetails.length > 0) {
                const ticket = ticketDetails[0];

                // Log the retrieved email
                console.log("Retrieved User Email:", ticket.email);

                if (!ticket.user_email) {
                    console.warn("No email found for assigned user.");
                    return null; // Prevent sending an email with undefined recipient
                }

                return ticket;
            }
        }
        return null;
    } catch (error) {
        console.error("Error in editTicketService:", error);
        throw new Error(error);
    }
};

// Get list of tickets with search and role-based filtering for ticket management
const getTicketsService = async (searchQuery = "", role, userId, page = 1, limit = 20) => {
    let sql = `
        SELECT tickets.*, registration.name AS name 
        FROM tickets 
        JOIN registration ON tickets.user_id = registration.id
    `;

    let countSql = `SELECT COUNT(*) as total FROM tickets JOIN registration ON tickets.user_id = registration.id`;

    const values = [];
    const countValues = [];

    if (role === "admin") {
        sql += ` WHERE (tickets.title LIKE ? OR registration.name LIKE ?)`;
        countSql += ` WHERE (tickets.title LIKE ? OR registration.name LIKE ?)`;
        values.push(`%${searchQuery}%`, `%${searchQuery}%`);
        countValues.push(`%${searchQuery}%`, `%${searchQuery}%`);
    } else if (role === "support agent") {
        sql += ` WHERE tickets.assigned_to = ? AND (tickets.title LIKE ? OR registration.name LIKE ?)`;
        countSql += ` WHERE tickets.assigned_to = ? AND (tickets.title LIKE ? OR registration.name LIKE ?)`;
        values.push(userId, `%${searchQuery}%`, `%${searchQuery}%`);
        countValues.push(userId, `%${searchQuery}%`, `%${searchQuery}%`);
    } else if (role === "customer") {
        sql += ` WHERE tickets.user_id = ? AND (tickets.title LIKE ? OR registration.name LIKE ?)`;
        countSql += ` WHERE tickets.user_id = ? AND (tickets.title LIKE ? OR registration.name LIKE ?)`;
        values.push(userId, `%${searchQuery}%`, `%${searchQuery}%`);
        countValues.push(userId, `%${searchQuery}%`, `%${searchQuery}%`);
    } else {
        throw new Error("Unauthorized role");
    }

    // Add pagination
    const offset = (page - 1) * limit;
    sql += ` LIMIT ? OFFSET ?`;
    values.push(parseInt(limit), parseInt(offset));

    try {
        const [result] = await pool.promise().query(sql, values);
        const [countResult] = await pool.promise().query(countSql, countValues);

        const totalTickets = countResult[0].total;
        const totalPages = Math.ceil(totalTickets / limit);

        return { tickets: result, totalTickets, totalPages, currentPage: page };
    } catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
};


const getExistingTickets = async () => {
    try {
        const query = "SELECT LOWER(TRIM(title)) AS title, LOWER(TRIM(description)) AS description FROM tickets";
        const [rows] = await pool.promise().query(query); // ✅ Fixed the method call
        return rows;
    } catch (error) {
        console.error("Database Error:", error);
        return [];
    }
};



// Update the status of a ticket
const updateTicketStatusService = async (ticket_number, status) => {
    const [ticket] = await pool.promise().query(
        `SELECT t.assigned_to, t.resolved_at, t.title, r.email AS user_email 
         FROM tickets t 
         JOIN registration r ON t.assigned_to = r.id 
         WHERE t.ticket_number = ?`,
        [ticket_number]
    );

    if (ticket.length === 0) {
        return { success: false, message: "Ticket not found" };
    }

    const { assigned_to, resolved_at, title, user_email } = ticket[0];

    if (!assigned_to) {
        return { success: false, message: "Ticket must be assigned before changing status." };
    }

    if (status === "closed" && !resolved_at) {
        return { success: false, message: "Ticket must be resolved before marking as closed." };
    }

    let sql = `UPDATE tickets SET status = ?`;
    let values = [status];

    if (status === "resolved") {
        sql += `, resolved_at = NOW()`;
    } else if (status === "closed") {
        sql += `, closed_at = NOW()`;
    } else if (status === "open" || status === "in progress") {
        sql += `, resolved_at = NULL, closed_at = NULL`; // Reset timestamps
    }

    sql += ` WHERE ticket_number = ?`;
    values.push(ticket_number);

    const [result] = await pool.promise().query(sql, values);

    return result.affectedRows > 0
        ? { success: true, user_email, ticket_number, status, title }
        : { success: false, message: "Update failed." };
};


// Assign a ticket to a user
const assignTicketService = async (ticket_number, user_id) => {
    try {
        const [updateResult] = await pool.promise().query(
            "UPDATE tickets SET assigned_to = ? WHERE ticket_number = ?",
            [user_id, ticket_number]
        );

        if (updateResult.affectedRows === 0) {
            return null; // No ticket was updated
        }

        // Fetch updated ticket details for email notification
        const [ticketResult] = await pool.promise().query(
            "SELECT t.ticket_number, t.title, t.status, u.email AS user_email FROM tickets t JOIN registration u ON t.assigned_to = u.id  WHERE t.ticket_number = ?",
            [ticket_number]
        );

        return ticketResult.length > 0 ? ticketResult[0] : null;
    } catch (error) {
        console.error("Database error:", error);
        throw new Error("Failed to assign ticket. Please try again.");
    }
};


// fetch tickets for dashboard


const fetchTicketsDashboardService = async (selectedDate) => {
    try {
        let query = `
           SELECT 
                tickets.*, 
                registration.name, 
                assigned_user.name AS assigned_to
            FROM tickets 
            JOIN registration ON tickets.user_id = registration.id
            LEFT JOIN registration AS assigned_user ON tickets.assigned_to = assigned_user.id
        `;

        const queryParams = [];

        if (selectedDate) {
            query += ` WHERE DATE(tickets.created_at) = ?`;
            queryParams.push(selectedDate);
        }

        query += ` ORDER BY tickets.created_at DESC LIMIT 10`; // ✅ Fetch only 10 tickets

        const [tickets] = await pool.promise().query(query, queryParams);
        return tickets;
    } catch (error) {
        throw new Error("Error fetching tickets: " + error.message);
    }
};



/***********************
 * Support Agents and Customers
 ***********************/

// Get list of support agents

const getSupportAgentService = async () => {
    try {
        const [agents] = await pool.promise().query(`
            SELECT id, name FROM registration WHERE role = 'support agent'
        `);
        return agents;
    } catch (error) {
        throw new Error("Error fetching all support agents: " + error.message);
    }
};

const getTopSupportAgentService = async () => {
    try {
        const [agents] = await pool.promise().query(`
            SELECT r.id, r.name, COUNT(t.id) AS solved_tickets
            FROM registration r
            LEFT JOIN tickets t ON r.id = t.assigned_to AND t.status = 'resolved'
            WHERE r.role = 'support agent'
            GROUP BY r.id, r.name
            ORDER BY solved_tickets DESC
            LIMIT 3
        `);
        return agents;
    } catch (error) {
        throw new Error("Error fetching top support agents: " + error.message);
    }
};



// Get list of customers
const getCustomerService = async () => {
    try {
        const [customers] = await pool.promise().query("SELECT id, name FROM registration WHERE role = 'customer'");
        return customers;
    } catch (error) {
        throw new Error("Error fetching customers: " + error.message);
    }
};

const fetchAgentCountService = async () => {
    try {
        const [result] = await pool.promise().query("SELECT COUNT(*) AS count FROM registration WHERE role = 'support agent' ");
        return result[0].count;
    } catch (err) {
        throw err;
    }
};

/***********************
 * Messaging Service
 ***********************/

// Send a message between users
const sendMessagesService = async (receiverId, senderId, message) => {
    const query = "INSERT INTO messages(receiver_id, sender_id, message, status) VALUES (?, ?, ?, 'sent')";
    try {
        const [result] = await pool.promise().query(query, [receiverId, senderId, message]);
        return { id: result.insertId, receiverId, senderId, message, status: "sent" };
    } catch (err) {
        throw err;
    }
};

// Fetch messages for a specific receiver
const fetchMessagesService = async (receiverId) => {
    const query = "SELECT * FROM messages WHERE receiver_id = ? ORDER BY timestamp ASC";
    try {
        const [result] = await pool.promise().query(query, [receiverId]);
        return result;
    } catch (err) {
        throw err;
    }
};

/***********************
 * Ticket Statistics
 ***********************/

// Fetch the count of tickets
const fetchTicketCountService = async (month = null) => {
    try {
        let query = 'SELECT COUNT(*) AS count FROM tickets';
        let params = [];

        if (month) {
            query += ' WHERE MONTH(created_at) = ?';
            params.push(parseInt(month));
        }

        const [result] = await pool.promise().query(query, params);
        return result[0].count;
    } catch (err) {
        throw err;
    }
};

// Fetch ticket statistics (total and resolved)
const fetchTicketStatsService = async () => {
    try {
        const [totalResult] = await pool.promise().query('SELECT COUNT(*) AS total FROM tickets');
        const [resolvedResult] = await pool.promise().query('SELECT COUNT(*) AS resolved FROM tickets WHERE status = "resolved"');

        return {
            total: totalResult[0].total,
            resolved: resolvedResult[0].resolved
        };
    } catch (err) {
        console.error('Database query error:', err.message);
        throw err;
    }
};

/***********************
 * Ticket Priority Stats
 ***********************/

// Fetch the count of tickets by priority
const getTicketPriorityService = async () => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT 
                SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) AS critical,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high,
                SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS medium,
                SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS low
            FROM tickets
        `);

        return rows[0]; // ✅ Returns the first row of results
    } catch (err) {
        console.error('An error occurred while fetching ticket priority:', err);
        return null; // ✅ Returns a fallback value to avoid crashes
    }
};

const fetchTicketStatusService = async () => {
    try {
        const query = 'SELECT status, COUNT(*) AS count FROM tickets GROUP BY status';
        const [results] = await pool.promise().query(query);
        const ticketData = {
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0
        };

        results.forEach(row => {
            const key = row.status.toLowerCase().replace(/\s+/g, "");
            if (ticketData.hasOwnProperty(key)) {
                ticketData[key] = row.count;
            }
        });

        return ticketData;
    } catch (err) {
        throw err;
    }
};

// Delete Ticket Service
const deleteTicketService = async (ticketId) => {
    try {
        const sql = "DELETE FROM tickets WHERE id = ?";
        const [result] = await pool.promise().query(sql, [ticketId]);

        if (result.affectedRows === 0) {
            return { success: false, error: "Ticket not found" };
        }
        return { success: true, message: "Ticket deleted successfully" };
    } catch (error) {
        console.error("Error deleting ticket:", error);
        throw new Error("Database error while deleting ticket");
    }
};


module.exports = {
    register, authenticateUser, getUserProfile,
    changePasswordService, getUsersService, changeRoleService,
    handleDeactivate, handleDeleteService, createTicketService,
    getTicketsService, updateTicketStatusService, assignTicketService,
    getSupportAgentService, sendMessagesService, fetchMessagesService,
    getCustomerService, fetchTicketCountService, fetchAgentCountService,
    fetchTicketStatsService, getTicketPriorityService, fetchTicketStatusService,
    fetchTicketsDashboardService, deleteTicketService, uploadBulkyTicketService,
    getExistingTickets, getTopSupportAgentService, updateProfileService, editTicketService
};
