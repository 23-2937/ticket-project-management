require('dotenv').config();
const nodemailer = require('nodemailer');

//Configure email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
});

const sendTicketEmail = (recipientEmail, ticketDetails, action) => {
    let emailSubject, emailMessage;

    if (action === 'created') {
        // Ticket Creation Email
        emailSubject = `Ticket created: #${ticketDetails.ticketId}`;
        emailMessage = `
    <h3 style="color: #007bff;">Your Support Ticket Has Been Created</h3>
    <p>Dear Customer,</p>
    <p>We have received your support request and assigned it a unique ticket number for tracking.</p>
    
    <h4>Ticket Details:</h4>
    <p><strong>Ticket Number:</strong> ${ticketDetails.ticketId}</p>
    <p><strong>Subject:</strong> ${ticketDetails.subject}</p>
    <p><strong>Status:</strong> ${ticketDetails.status}</p>
    
    <p>Our support team is actively reviewing your request and will work to resolve it as soon as possible.</p>
    <p>You can log in to your account at any time to check for updates on your ticket.</p>
    
    <p>We appreciate your patience and value your trust in our support team.</p>

    <br>
    <p style="color: #007bff; font-weight: bold;">Best regards,</p>
    <p><strong>LociAfrica Support Team</strong></p>
`;


    } else if (action === 'assigned') {
        // Ticket Assignment Email
        emailSubject = `Ticket Assigned: #${ticketDetails.ticketId}`;
        emailMessage = `
    <h3 style="color: #007bff;">A New Ticket Has Been Assigned to You</h3>
    <p>Dear Team Member,</p>
    
    <h4>Ticket Details:</h4>
    <p><strong>Ticket Number:</strong> ${ticketDetails.ticketId}</p>
    <p><strong>Status:</strong> ${ticketDetails.status}</p>
    
    <p>You have been assigned a new support ticket. Please log in to the system to review the details and take the necessary action.</p>
    
    <p>Thank you for your prompt attention to this matter.</p>

    <br>
    <p style="color: #007bff; font-weight: bold;">Best regards,</p>
    <p><strong>LociAfrica Support Team</strong></p>
`;



    
} else if (action === 'resolved') {
        // Ticket Resolved Email
        emailSubject = `Ticket Resolved: #${ticketDetails.ticketId}`;
        emailMessage = `
    <h3 style="color: #28a745;">Your Support Ticket Has Been Resolved</h3>
    <p>Dear Valued Customer,</p>

    <h4>Ticket Details:</h4>
    <p><strong>Ticket Number:</strong> ${ticketDetails.ticketId}</p>
    <p><strong>Subject:</strong> ${ticketDetails.title}</p>
    <p><strong>Status:</strong> (Resolved)</p>

    <p>We are pleased to inform you that your support ticket has been successfully resolved. 
    If you have any further concerns or need additional assistance, feel free to reach out to our support team.</p>

    <p>Thank you for choosing LociAfrica.</p>

    <br>
    <p style="color: #28a745; font-weight: bold;">Best regards,</p>
    <p><strong>LociAfrica Support Team</strong></p>
`;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail, // Corrected variable name
        subject: emailSubject,
        html: emailMessage,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
        } else {
            console.log(`Email sent successfully to ${recipientEmail}:`, info.response);
        }
    });
};

module.exports = sendTicketEmail;


module.exports = sendTicketEmail;