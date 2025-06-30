const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose); // For auto-incrementing ticket numbers

const ticketSchema = new mongoose.Schema({
    // ticket_number will be auto-incremented, handled by plugin
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'low'
    },
    status: {
        type: String,
        enum: ['open', 'assigned', 'in-progress', 'resolved', 'closed'],
        default: 'open'
    },
    customer: { // Renamed from user_id to customer for clarity, referencing the User model
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: { // Agent assigned to the ticket
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Can be null if not yet assigned
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Apply the auto-increment plugin to generate ticket_number
ticketSchema.plugin(AutoIncrement, { inc_field: 'ticket_number', start_seq: 1000 }); // Start from 1000

// Update `updatedAt` field on every save/update
ticketSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

ticketSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;