const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send announcement email to all active employees.
 * @param {string[]} bccList - Array of employee email addresses
 * @param {string} title - Announcement title
 * @param {string} content - Announcement content
 * @param {string} dateStr - Formatted date string (e.g. DD/MM/YYYY)
 */
const sendAnnouncementEmail = async (bccList, title, content, dateStr) => {
  if (!process.env.SMTP_USER && !process.env.SMTP_HOST) {
    console.warn('⚠️ SMTP not configured. Skipping email dispatch.');
    return;
  }

  const subject = `${title} – ${dateStr}`;
  
  // Format the email exactly as requested by the user
  const htmlContent = `
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
      Dear All Team Members,<br><br>
      ${content.replace(/\n/g, '<br>')}<br><br>
      Thank you for your cooperation.
    </p>
  `;

  const mailOptions = {
    from: '"JadeQuest HR" <hr@jadequest.com>',
    to: 'internal@jadequest.com', // Generic internal address to hide the BCC list from 'To' field
    bcc: bccList,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Announcement email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send announcement email:`, error);
    // We do not throw the error to prevent the main API request from failing
  }
};

module.exports = {
  sendAnnouncementEmail
};
