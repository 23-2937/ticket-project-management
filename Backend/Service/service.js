// service/service.js
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken'); // Assuming you're using JWT for authentication
const bcrypt = require('bcryptjs'); // For password hashing
const mongoose = require('mongoose'); // Needed for ObjectId validation

// ====================================================
// Authentication & User Management Services
// ====================================================

const register = async (name, email, password) => {
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const newUser = new User({ name, email, password });
        await newUser.save();
        return { success: true, message: 'Registration successful' };
    } catch (error) {
        throw error;
    }
};

const authenticateUser = async (email, password) => {
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }

        if (user.status === 'inactive') {
            return { success: false, error: 'Your account is inactive. Please contact support.' };
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return { success: false, error: 'Invalid email or password' };
        }

        // Generate JWT token
        const authToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        return {
            success: true,
            user: {
                name: user.name,
                role: user.role,
                email: user.email,
                id: user._id, // MongoDB's _id
            },
            authToken
        };
    } catch (error) {
        console.error('Error in authenticateUser:', error);
        throw new Error('Authentication failed');
    }
};

const getUserProfile = async (email) => {
    try {
        const user = await User.findOne({ email }).select('-password'); // Exclude password
        return user;
    } catch (error) {
        throw error;
    }
};

const changePasswordService = async (authToken, currentPassword, newPassword) => {
    try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return { status: 404, data: { error: 'User not found' } };
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return { status: 401, data: { error: 'Invalid current password' } };
        }

        user.password = newPassword; // Mongoose pre-save hook will hash it
        await user.save();
        return { status: 200, data: { message: 'Password updated successfully' } };
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return { status: 401, data: { error: 'Unauthorized: Invalid token' } };
        }
        throw error;
    }
};

const updateProfileService = async (name, email) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { email: email },
            { name: name, updatedAt: Date.now() },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            throw new Error('User not found');
        }
        return updatedUser;
    } catch (error) {
        throw error;
    }
};

// ====================================================
// User Management Services
// ====================================================

const getUsersService = async (search, role) => {
    try {
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }
        const users = await User.find(query).select('-password');
        return users;
    } catch (error) {
        throw error;
    }
};

const changeRoleService = async (id, newRole) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { affectedRows: 0, message: 'Invalid User ID' };
        }

        const result = await User.findByIdAndUpdate(
            id,
            { role: newRole, updatedAt: Date.now() },
            { new: true } // Return the updated document
        );
        return { affectedRows: result ? 1 : 0 }; // Mimic affectedRows from MySQL
    } catch (error) {
        throw error;
    }
};

const handleDeactivate = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null; // Mimic 'User not found'
        }

        const user = await User.findById(id);
        if (!user) {
            return null;
        }

        user.status = user.status === 'active' ? 'inactive' : 'active';
        await user.save();
        return { status: user.status };
    } catch (error) {
        throw error;
    }
};

const handleDeleteService = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { affectedRows: 0, message: 'Invalid User ID' };
        }

        const result = await User.findByIdAndDelete(id);
        return { affectedRows: result ? 1 : 0 };
    } catch (error) {
        throw error;
    }
};

// ====================================================
// Ticket Management Services
// ====================================================

const createTicketService = async ({ customer, title, description, priority }) => {
    try {
        // Find user to get email for notification
        const user = await User.findById(customer);
        if (!user) {
            throw new Error('Customer not found for ticket creation');
        }

        const newTicket = new Ticket({
            customer, // user._id
            title,
            description,
            priority,
            status: 'open'
        });
        const savedTicket = await newTicket.save();

        return {
            success: true,
            ticket_number: savedTicket.ticket_number, // Auto-incremented ID
            user_email: user.email,
            title: savedTicket.title,
            status: savedTicket.status
        };
    } catch (error) {
        throw error;
    }
};

const uploadBulkyTicketService = async (ticketsData, userId) => {
    try {
        // Ensure userId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid User ID for bulk upload');
        }

        const bulkOperations = ticketsData.map(ticket => ({
            insertOne: {
                document: {
                    customer: userId,
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: 'open',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }
        }));

        const result = await Ticket.bulkWrite(bulkOperations);
        return result.insertedCount; // Number of documents inserted
    } catch (error) {
        throw error;
    }
};

const getExistingTickets = async () => {
    try {
        // Fetch only title and description for duplicate checking
        const existingTickets = await Ticket.find({}, 'title description');
        return existingTickets;
    } catch (error) {
        throw error;
    }
};

const editTicketService = async (ticketNumber, userId) => {
    try {
        // Find the ticket by its auto-incremented ticket_number
        const ticket = await Ticket.findOne({ ticket_number: ticketNumber });

        if (!ticket) {
            return null; // Ticket not found
        }

        // Validate userId as a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid User ID provided for reassignment.');
        }

        const assignedToUser = await User.findById(userId);
        if (!assignedToUser) {
            throw new Error('Assigned user (agent) not found.');
        }
        if (assignedToUser.role !== 'agent' && assignedToUser.role !== 'admin') {
            throw new Error('User can only be assigned to an Agent or Admin.');
        }

        ticket.assignedTo = userId;
        ticket.status = 'assigned'; // Update status to assigned
        await ticket.save(); // Mongoose pre-save hook handles updatedAt

        // Fetch the customer's email for notification
        const customerUser = await User.findById(ticket.customer);
        return {
            ticket_number: ticket.ticket_number,
            status: ticket.status,
            user_email: customerUser ? customerUser.email : null, // Ensure email is available
        };

    } catch (error) {
        console.error("Error in editTicketService:", error);
        throw error;
    }
};


const getTicketsService = async (searchQuery, role, userId, page, limit) => {
    try {
        let query = {};
        let userObjectId;

        // Ensure userId is a valid ObjectId if provided
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            userObjectId = new mongoose.Types.ObjectId(userId);
        } else {
            // If userId is invalid or not provided when expected for role-based queries, throw an error
            if (role === 'customer' || role === 'agent') {
                throw new Error('Invalid User ID provided for role-based ticket fetching.');
            }
        }

        // Build query based on role
        if (role === 'customer' && userObjectId) {
            query.customer = userObjectId;
        } else if (role === 'agent' && userObjectId) {
            query.assignedTo = userObjectId;
        }
        // Admin role or 'all' will have no specific user filter for tickets

        if (searchQuery) {
            query.$or = [
                { title: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
                { ticket_number: isNaN(parseInt(searchQuery)) ? null : parseInt(searchQuery) } // Search by ticket_number if it's a number
            ].filter(Boolean); // Remove null entries from $or if ticket_number isn't a number
        }

        const skip = (page - 1) * limit;
        const totalTickets = await Ticket.countDocuments(query);
        const tickets = await Ticket.find(query)
            .populate('customer', 'name email') // Populate customer name and email
            .populate('assignedTo', 'name email') // Populate assigned agent name and email
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return {
            tickets,
            currentPage: page,
            totalPages: Math.ceil(totalTickets / limit),
            totalTickets
        };
    } catch (error) {
        throw error;
    }
};

const updateTicketStatusService = async (ticket_number, status) => {
    try {
        const ticket = await Ticket.findOneAndUpdate(
            { ticket_number: ticket_number },
            { status: status, updatedAt: Date.now() },
            { new: true } // Return the updated document
        ).populate('customer', 'email name'); // Populate customer to get email for notification

        if (!ticket) {
            return { success: false, message: 'Ticket not found.' };
        }

        return {
            success: true,
            ticket_number: ticket.ticket_number,
            title: ticket.title,
            status: ticket.status,
            user_email: ticket.customer ? ticket.customer.email : null
        };
    } catch (error) {
        throw error;
    }
};


const assignTicketService = async (ticket_number, userId) => {
    try {
        // Validate userId as a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid User ID provided for assignment.');
        }

        const assignedToUser = await User.findById(userId);
        if (!assignedToUser) {
            throw new Error('Assigned user (agent/admin) not found.');
        }
        if (assignedToUser.role !== 'agent' && assignedToUser.role !== 'admin') {
            throw new Error('Ticket can only be assigned to an Agent or Admin.');
        }

        const ticket = await Ticket.findOneAndUpdate(
            { ticket_number: ticket_number, status: { $ne: 'closed' } }, // Can't assign closed tickets
            { assignedTo: userId, status: 'assigned', updatedAt: Date.now() },
            { new: true } // Return the updated document
        ).populate('customer', 'email name'); // Populate customer to get email for notification

        if (!ticket) {
            return null; // Ticket not found or already closed
        }

        return {
            ticket_number: ticket.ticket_number,
            title: ticket.title,
            status: ticket.status,
            user_email: ticket.customer ? ticket.customer.email : null
        };
    } catch (error) {
        throw error;
    }
};

// ====================================================
// Support Agent and Customer Management Services
// ====================================================

const getSupportAgentService = async () => {
    try {
        const agents = await User.find({ role: 'agent', status: 'active' }).select('-password');
        return agents;
    } catch (error) {
        throw error;
    }
};

const getTopSupportAgentService = async () => {
    try {
        // This aggregation pipeline counts resolved tickets for each agent
        const topAgents = await Ticket.aggregate([
            { $match: { status: 'resolved', assignedTo: { $ne: null } } },
            { $group: {
                _id: '$assignedTo',
                resolvedTickets: { $sum: 1 }
            }},
            { $sort: { resolvedTickets: -1 } },
            { $limit: 5 }, // Get top 5 agents
            { $lookup: {
                from: 'users', // The collection name for the User model
                localField: '_id',
                foreignField: '_id',
                as: 'agentDetails'
            }},
            { $unwind: '$agentDetails' },
            { $project: {
                _id: 0,
                agentId: '$_id',
                name: '$agentDetails.name',
                email: '$agentDetails.email',
                resolvedTickets: '$resolvedTickets'
            }}
        ]);
        return topAgents;
    } catch (error) {
        throw error;
    }
};

const getCustomerService = async () => {
    try {
        const customers = await User.find({ role: 'customer' }).select('-password');
        return customers;
    } catch (error) {
        throw error;
    }
};

// ====================================================
// Messaging & Communication Services
// ====================================================

const sendMessagesService = async (receiverId, senderId, messageContent) => {
    try {
        // Validate sender and receiver IDs
        if (!mongoose.Types.ObjectId.isValid(receiverId) || !mongoose.Types.ObjectId.isValid(senderId)) {
            throw new Error('Invalid sender or receiver ID.');
        }

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            message: messageContent
        });
        await newMessage.save();
        return { success: true, message: 'Message sent' };
    } catch (error) {
        throw error;
    }
};

const fetchMessagesService = async (receiverId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            throw new Error('Invalid receiver ID.');
        }
        // Fetch messages where the current user is either sender or receiver
        const messages = await Message.find({
            $or: [
                { sender: receiverId },
                { receiver: receiverId }
            ]
        })
        .populate('sender', 'name email') // Populate sender details
        .populate('receiver', 'name email') // Populate receiver details
        .sort({ createdAt: 1 }); // Sort by creation time

        return messages;
    } catch (error) {
        throw error;
    }
};

// ====================================================
// Stats and Count Services
// ====================================================

const fetchTicketCountService = async (month) => {
    try {
        let query = {};
        if (month) {
            const year = new Date().getFullYear(); // Assuming current year
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
            query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
        }
        const count = await Ticket.countDocuments(query);
        return count;
    } catch (error) {
        throw error;
    }
};

const fetchAgentCountService = async () => {
    try {
        const count = await User.countDocuments({ role: 'agent' });
        return count;
    } catch (error) {
        throw error;
    }
};

const fetchTicketStatsService = async () => {
    try {
        const stats = await Ticket.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1
                }
            }
        ]);

        // Transform array of objects into a more accessible object
        const formattedStats = {};
        stats.forEach(stat => {
            formattedStats[stat.status] = stat.count;
        });
        return formattedStats;
    } catch (error) {
        throw error;
    }
};

const getTicketPriorityService = async () => {
    try {
        const priorityStats = await Ticket.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    priority: '$_id',
                    count: 1
                }
            }
        ]);

        // Transform array into an object for easier consumption
        const result = {};
        priorityStats.forEach(item => {
            result[item.priority] = item.count;
        });
        return result;
    } catch (error) {
        throw error;
    }
};

const fetchTicketStatusService = async () => {
    try {
        const statusData = await Ticket.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1
                }
            }
        ]);

        const result = {};
        statusData.forEach(item => {
            result[item.status] = item.count;
        });
        return result;
    } catch (error) {
        throw error;
    }
};

const fetchTicketsDashboardService = async () => {
    try {
        // Example: Get latest 5 tickets
        const latestTickets = await Ticket.find({})
            .populate('customer', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        // You can add more dashboard-specific data here if needed
        return { latestTickets };
    } catch (error) {
        throw error;
    }
};


const deleteTicketService = async (id) => {
    try {
        // MongoDB's _id is typically a string, ensure it's a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, error: 'Invalid Ticket ID provided.' };
        }

        const result = await Ticket.findByIdAndDelete(id);

        if (!result) {
            return { success: false, error: 'Ticket not found.' };
        }
        return { success: true, message: 'Ticket deleted successfully!' };
    } catch (error) {
        throw error;
    }
};


module.exports = {
    register,
    authenticateUser,
    getUserProfile,
    changePasswordService,
    updateProfileService,
    getUsersService,
    changeRoleService,
    handleDeactivate,
    handleDeleteService,
    createTicketService,
    uploadBulkyTicketService,
    getExistingTickets,
    editTicketService,
    getTicketsService,
    updateTicketStatusService,
    assignTicketService,
    getSupportAgentService,
    getTopSupportAgentService,
    getCustomerService,
    sendMessagesService,
    fetchMessagesService,
    fetchTicketCountService,
    fetchAgentCountService,
    fetchTicketStatsService,
    getTicketPriorityService,
    fetchTicketStatusService,
    fetchTicketsDashboardService,
    deleteTicketService
};