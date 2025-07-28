// controllers/controller.js (Your original file, with minor adjustments)
const XLSX = require('xlsx');
const service = require('../Service/service'); // This will now use the Mongoose-based service
const sendTicketEmail = require("../email"); // Assuming this utility is still valid

// ====================================================
// Authentication & User Management Controllers
// ====================================================

// Controller: addCustomer
const addCustomer = async (req, res) => {
    console.log("Adding customer...");
    const { name, email, password } = req.body;
    console.log(req.body);

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        await service.register(name, email, password);
        return res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        console.error('Error in addCustomer:', err);
        // Handle specific Mongoose unique constraint errors if needed
        if (err.message.includes('Email already registered')) {
            return res.status(409).json({ success: false, message: err.message }); // 409 Conflict
        }
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Controller: login
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const result = await service.authenticateUser(email, password);

        if (result.success) {
            return res.json({
                message: 'Login successful',
                name: result.user.name,
                role: result.user.role,
                email: result.user.email,
                id: result.user.id, // Now MongoDB's _id
                authToken: result.authToken
            });
        }
        // Check if the error message is due to inactivity
        else if (result.error === "Your account is inactive. Please contact support.") {
            return res.status(403).json({ message: result.error }); // 403 = Forbidden
        }
        else {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error in login:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Controller: userProfile
const userProfile = async (req, res) => {
    try {
        const { email } = req.body; // Assuming email is sent in body for profile lookup

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await service.getUserProfile(email);
        if (user) {
            return res.json({
                success: true,
                name: user.name,
                role: user.role,
                email: user.email,
                status: user.status
            });
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error('Error in userProfile:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Controller: changePassword
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const authToken = authHeader.split(' ')[1];

    try {
        const response = await service.changePasswordService(authToken, currentPassword, newPassword);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'An error occurred while changing the password' });
    }
};

const updateProfile = async (req, res) => {
    const { email, name } = req.body;

    if (!email || !name) {
        return res.status(400).json({ message: 'Email and name are required' });
    }

    try {
        await service.updateProfileService(name, email);
        return res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// ====================================================
// User Management Controllers
// ====================================================

// Controller: getUsers
const getUsers = async (req, res) => {
    const { search, role } = req.query;
    try {
        const users = await service.getUsersService(search, role);
        return res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

// Controller: changeRole
const changeRole = async (req, res) => {
    const { id } = req.params; // This `id` will be the MongoDB _id string
    const { role } = req.body;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Role is required' });
        }

        const result = await service.changeRoleService(id, role);

        // Mongoose findByIdAndUpdate returns null if not found, we check for that
        if (result.affectedRows === 0) { // Mimicking original behavior
            return res.status(404).json({ message: 'User not found or Invalid ID' });
        }

        return res.json({ message: 'Role updated successfully' });
    } catch (err) {
        console.error('Error changing the role:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Controller: deactivateUser
const deactivateUser = async (req, res) => {
    const { id } = req.params; // MongoDB _id string

    try {
        const result = await service.handleDeactivate(id);

        if (!result) { // If service returns null, user was not found or invalid ID
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({ message: `User status changed to ${result.status}` });
    } catch (err) {
        console.error('Error changing the user status:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Controller: deleteUser
const deleteUser = async (req, res) => {
    const { id } = req.params; // MongoDB _id string
    try {
        const result = await service.handleDeleteService(id);

        if (result.affectedRows === 0) { // Mimicking original behavior
            return res.status(404).json({ message: 'User not found or Invalid ID' });
        }

        return res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// ====================================================
// Ticket Management Controllers
// ====================================================

// Controller: createTicket
const createTicket = async (req, res) => {
    try {
        const { title, description, priority } = req.body;
        // userId from auth middleware is preferred, fallback to body (less secure)
        const customer = req.userId || req.body.user_id;

        if (!title || !description || !priority) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!customer) {
            return res.status(401).json({ message: 'Unauthorized: User ID missing for ticket creation' });
        }

        const result = await service.createTicketService({ customer, title, description, priority });

        res.status(201).json({
            message: 'Ticket created successfully',
            ticketId: result.ticket_number // Now the auto-incremented number
        });

        // Send email notification (failures won't affect the API response)
        try {
            await sendTicketEmail(
                result.user_email,
                {
                    ticketId: result.ticket_number,
                    subject: result.title,
                    status: result.status
                },
                "created"
            );

        } catch (emailError) {
            console.error("Error sending email:", emailError);
        }

    } catch (error) {
        console.error("Error creating ticket:", error);
        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

const uploadBulkyTicket = async (req, res) => {
    try {
        if (!req.file || req.file.size === 0) {
            return res.status(400).json({ message: "Invalid file uploaded" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let jsonData = XLSX.utils.sheet_to_json(sheet);

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            return res.status(400).json({ message: "Invalid Excel file" });
        }

        const requiredColumns = ["title", "description", "priority"];
        const firstRow = Object.keys(jsonData[0] || {});
        const missingColumns = requiredColumns.filter(col => !firstRow.includes(col));

        if (missingColumns.length > 0) {
            return res.status(400).json({ message: `Missing columns: ${missingColumns.join(", ")}` });
        }

        const normalizeText = (text) => String(text).toLowerCase().trim().replace(/\s+/g, " ");

        const emptyRows = jsonData.filter(row =>
            requiredColumns.some(col => !row[col] || String(row[col]).trim() === "")
        );

        if (emptyRows.length > 0) {
            return res.status(400).json({ message: "Some rows contain empty required fields." });
        }

        const uniqueTickets = [];
        const ticketSet = new Set();

        jsonData.forEach(ticket => {
            const key = `${normalizeText(ticket.title)}|${normalizeText(ticket.description)}`;
            if (!ticketSet.has(key)) {
                ticketSet.add(key);
                uniqueTickets.push(ticket);
            }
        });

        if (uniqueTickets.length === 0) {
            return res.status(400).json({ message: "No unique tickets found in the file." });
        }

        let user_id = req.userId || req.body.user_id;

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized: User ID not found" });
        }

        const existingTickets = await service.getExistingTickets();
        const existingSet = new Set(existingTickets.map(ticket =>
            `${normalizeText(ticket.title)}|${normalizeText(ticket.description)}`
        ));

        const newTickets = uniqueTickets.filter(ticket => {
            const key = `${normalizeText(ticket.title)}|${normalizeText(ticket.description)}`;
            return !existingSet.has(key);
        });

        if (newTickets.length === 0) {
            return res.status(400).json({ message: "All tickets already exist in the database." });
        }

        const insertedRows = await service.uploadBulkyTicketService(newTickets, user_id);
        return res.status(201).json({ message: `${insertedRows} new tickets uploaded successfully!` });

    } catch (error) {
        console.error("Bulk Upload Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const editTicket = async (req, res) => {
    const { ticketNumber } = req.params; // This is the auto-incremented ticket_number
    const { user_id } = req.body; // The ID of the agent to assign to

    if (!user_id) {
        return res.status(400).json({ message: "User ID is required." });
    }

    try {
        const updatedTicket = await service.editTicketService(ticketNumber, user_id);

        if (!updatedTicket) {
            return res.status(404).json({ message: "Ticket not found." });
        }

        // Send email notification (failures won't affect the API response)
        try {
            await sendTicketEmail(
                updatedTicket.user_email,
                {
                    ticketId: updatedTicket.ticket_number,
                    status: updatedTicket.status
                },
                "assigned" // Using "assigned" email template for reassign/edit
            );
        } catch (emailError) {
            console.error("Error sending email:", emailError);
        }

        return res.status(200).json({ message: "Ticket reassigned successfully!" });
    } catch (error) {
        console.error("Ticket update failed:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
//deleteUser
// Controller: getTickets
const getTickets = async (req, res) => {
    try {
        const searchQuery = req.query.query || "";
        const role = req.query.role;
        const userId = req.query.userId; // This userId should now be the MongoDB _id string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        if (!role || !userId) {
            // Depending on your auth, userId might be in req.userId from middleware
            // For admin, userId might not be strictly needed for *all* tickets.
            // Adjust validation based on how admins fetch tickets.
            // For now, mirroring original, assuming userId for role-based filtering.
            return res.status(400).json({ message: "User role and ID are required" });
        }

        const result = await service.getTicketsService(searchQuery, role, userId, page, limit);

        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Controller: updateTicketStatus
const updateTicketStatus = async (req, res) => {
    const { ticket_number, status } = req.body; // ticket_number is the auto-incremented field

    try {
        const result = await service.updateTicketStatusService(ticket_number, status);

        if (!result.success) {
            return res.status(400).json({ message: result.message });
        }

        res.status(200).json({ message: "Ticket status updated successfully" });

        // Send email notification
        if (result.user_email) {
            try {
                await sendTicketEmail(
                    result.user_email,
                    {
                        ticketId: result.ticket_number,
                        title: result.title,
                        status: result.status
                    },
                    "resolved" // Assuming this is for status change to "resolved"
                );
            } catch (emailError) {
                console.error("Error sending email:", emailError);
            }
        }
    } catch (error) {
        console.error("Error updating ticket:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Controller: assignTicket
const assignTicket = async (req, res) => {
    const { ticket_number, user_id } = req.body; // user_id here is the agent's MongoDB _id

    if (!ticket_number || !user_id) {
        return res.status(400).json({ message: "Ticket number and user ID are required." });
    }

    try {
        const ticketDetails = await service.assignTicketService(ticket_number, user_id);

        if (!ticketDetails) {
            return res.status(404).json({ message: "Ticket not found or already assigned." });
        }

        res.status(200).json({ message: "Ticket assigned successfully!" });

        // Send email notification
        try {
            await sendTicketEmail(
                ticketDetails.user_email,
                {
                    ticketId: ticketDetails.ticket_number,
                    title: ticketDetails.title,
                    status: ticketDetails.status
                },
                "assigned"
            );
            console.log(`Assignment email sent to ${ticketDetails.user_email}`);
        } catch (emailError) {
            console.error("Error sending email:", emailError);
        }

    } catch (error) {
        console.error("Error assigning ticket:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// ====================================================
// Support Agent and Customer Management Controllers
// ====================================================

// Controller: fetchSupportAgents
const fetchSupportAgents = async (req, res) => {
    try {
        const agents = await service.getSupportAgentService();
        res.json(agents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const fetchTopSupportAgents = async (req, res) => {
    try {
        const agents = await service.getTopSupportAgentService();
        res.json(agents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
// Controller: fetchCustomers
const fetchCustomers = async (req, res) => {
    try {
        const customer = await service.getCustomerService();
        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// ====================================================
// Messaging & Communication Controllers
// ====================================================

// Controller: sendMessages
const sendMessages = async (req, res) => {
    const { receiverId, senderId, message } = req.body; // These are MongoDB _ids
    try {
        const results = await service.sendMessagesService(receiverId, senderId, message);
        return res.status(201).json(results);
    } catch (err) {
        console.error("Error sending message:", err);
        res.status(500).json({ error: "Failed to send message" });
    }
};

// Controller: fetchMessages
const fetchMessages = async (req, res) => {
    const { receiverId } = req.params; // This is a MongoDB _id
    try {
        const messages = await service.fetchMessagesService(receiverId);
        res.json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ error: "Error fetching messages" });
    }
};

// ====================================================
// Stats and Count Controllers
// ====================================================

// Controller: fetchTicketCount
const fetchTicketCount = async (req, res) => {
    try {
        const month = req.query.month ? parseInt(req.query.month) : null;
        const count = await service.fetchTicketCountService(month);
        res.json({ count });
    } catch (err) {
        console.error('Error fetching ticket count:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Controller: fetchAgentCount
const fetchAgentCount = async (req, res) => {
    try {
        const count = await service.fetchAgentCountService();
        res.json({ count });
    } catch (error) {
        console.error('Error fetching agent count:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Controller: fetchTicketStats
const fetchTicketStats = async (req, res) => {
    try {
        const stats = await service.fetchTicketStatsService();
        res.json(stats);
    } catch (err) {
        console.error('Error fetching ticket statistics:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Controller: fetchTicketPriority
const fetchTicketPriority = async (req, res) => {
    try {
        const ticketPriority = await service.getTicketPriorityService();

        if (!ticketPriority) { // Service might return empty object, not null
            return res.status(404).json({ error: 'No ticket priority data found' });
        }

        res.status(200).json(ticketPriority);
    } catch (err) {
        console.error('Error fetching ticket priority:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Controller: fetchTicketStatus
const fetchTicketStatus = async (req, res) => {
    try {
        const data = await service.fetchTicketStatusService();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const fetchTicketsDashboard = async (req, res) => {
    try {
        const data = await service.fetchTicketsDashboardService();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Ticket Controller
const deleteTicket = async (req, res) => {
    const { id } = req.params; // This will be the MongoDB _id string

    if (!id) {
        return res.status(400).json({ error: "Ticket ID is required" });
    }

    try {
        const result = await service.deleteTicketService(id);

        if (!result.success) {
            return res.status(404).json({ error: result.error });
        }
        return res.json({ message: result.message });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};


module.exports = {
    login, addCustomer, userProfile,
    changePassword, getUsers, changeRole, deactivateUser,
    deleteUser, createTicket, getTickets, updateTicketStatus,
    assignTicket, fetchSupportAgents, sendMessages, fetchMessages,
    fetchCustomers, fetchAgentCount, fetchTicketCount, fetchTicketStats,
    fetchTicketPriority, fetchTicketStatus, fetchTicketsDashboard, deleteTicket,
    uploadBulkyTicket, fetchTopSupportAgents, updateProfile, editTicket
};