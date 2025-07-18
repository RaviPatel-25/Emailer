const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Gmail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// In-memory tracking: { user: { count, firstEmailTime } }
const userLimits = {};
const EMAIL_LIMIT = 2;
const TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

app.post('/send-email', async (req, res) => {
    try {
        const { user, to, subject, message } = req.body;
        if (!user || !to || !subject || !message) {
            return res.status(400).json({ error: 'user, to, subject, and message are required' });
        }

        // Check and reset limits if needed
        if (!userLimits[user]) {
            userLimits[user] = { count: 0, firstEmailTime: Date.now() };
        } else if (Date.now() - userLimits[user].firstEmailTime > TIME_WINDOW) {
            userLimits[user] = { count: 0, firstEmailTime: Date.now() };
        }

        // Check if user exceeded the limit
        if (userLimits[user].count >= EMAIL_LIMIT) {
            return res.status(429).json({
                success: false,
                message: 'Daily email limit exceeded. Try again after 24 hours.'
            });
        }

        // Send email
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to,
            subject,
            text: message
        });

        // Update count
        userLimits[user].count++;
        res.json({ success: true, sentTo: to, remaining: EMAIL_LIMIT - userLimits[user].count });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Gmail SMTP API running on port ${PORT}`);
});
