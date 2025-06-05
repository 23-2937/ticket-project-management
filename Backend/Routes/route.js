const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const controller = require('../Controllers/controller');

// Login Route
router.post('/login', controller.login);

// Register Route
router.post('/register', controller.addCustomer);

// User Profile Route
router.post('/register/profile', controller.userProfile);

// Change Password Route
router.post('/registration/change-password', controller.changePassword);

// Get Users Route (User Management)
router.get('/registration', controller.getUsers);

// Change User Role Route
router.put('/registration/:id/role', controller.changeRole);

// Activate/Deactivate User Account Route
router.put('/registration/:id/deactivate', controller.deactivateUser);

// Delete User Route
router.delete('/registration/:id', controller.deleteUser);

// Create Ticket Route
router.post('/tickets', controller.createTicket);

// Get Tickets Route
router.get('/tickets', controller.getTickets);

// Update Ticket Status Route
router.put('/tickets/:ticketNumber/status', controller.updateTicketStatus);

// Assign Ticket Route
router.put('/tickets/:ticketNumber/assign', controller.assignTicket);

// Fetch Support Agents Route
router.get('/registration/agents', controller.fetchSupportAgents);

// Fetch Support Agents Route
router.get('/registration/top/agents', controller.fetchTopSupportAgents);

// Fetch Customers Route
router.get('/registration/customers', controller.fetchCustomers);

// Send Messages Route
router.post("/messages", controller.sendMessages);

// Fetch Messages Route
router.get("/messages:userId", controller.fetchMessages);

// Dashboard - Fetch Agent Count Route
router.get("/agents/count", controller.fetchAgentCount);

// Fetch Ticket Count Route
router.get("/tickets/count", controller.fetchTicketCount);

// Fetch Ticket Stats Route (Ticket Statistics)
router.get("/tickets/stats", controller.fetchTicketStats);

// Fetch Ticket Priority Route
router.get("/tickets/priority", controller.fetchTicketPriority);

// Fetch Ticket Status Route
router.get("/tickets/status", controller.fetchTicketStatus);

// fetch Ticket list dashboard
router.get("/tickets/list", controller.fetchTicketsDashboard);

// DELETE Ticket Route
router.delete("/tickets/:id", controller.deleteTicket);

// 🛠 BULK UPLOAD ROUTE
router.post("/tickets/bulk", upload.single("file"), controller.uploadBulkyTicket);

//update profile
router.put("/registration/update", controller.updateProfile);

//update assigned to
router.put("/ticket/:ticketNumber/edit-assigned", controller.editTicket);

module.exports = router;
