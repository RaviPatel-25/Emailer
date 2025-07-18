const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Gmail credentials (development mode only)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ramu1212patel8989@gmail.com',        // your Gmail address
        pass: 'ravi6388876295'            // your Gmail App Password
    }
});

// Simple in-memory store: { email: { count, firstEmailTime } }
const userLimits = {};
const EMAIL_LIMIT = 2;
const TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

app.post('/send-email', async (req, res) => {
    try {
        const { to, subject, message, user } = req.body;
        if (!to || !subject || !message || !user) {
            return res.status(400).json({ error: 'user, to, subject, and message are required' });
        }

        // Initialize user limit tracking
        if (!userLimits[user]) {
            userLimits[user] = { count: 0, firstEmailTime: Date.now() };
        }

        const userData = userLimits[user];

        // Reset count if 24 hours passed
        if (Date.now() - userData.firstEmailTime > TIME_WINDOW) {
            userData.count = 0;
            userData.firstEmailTime = Date.now();
        }

        // Check limit
        if (userData.count >= EMAIL_LIMIT) {
            return res.status(429).json({
                success: false,
                message: 'Daily email limit exceeded. Try again after 24 hours.'
            });
        }

        // Send email
        await transporter.sendMail({
            from: 'ramu1212patel8989@gmail.com,
            to,
            subject,
            text: message
        });

        // Update user’s sent count
        userData.count++;

        res.json({ success: true, sentTo: to, remaining: EMAIL_LIMIT - userData.count });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(3000, () => {
    console.log('Gmail SMTP API with daily limit running on http://localhost:3000');
});
