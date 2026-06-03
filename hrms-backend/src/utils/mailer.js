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
  
  // Format the email to look beautiful and professional
  const htmlContent = `
    <div style="background-color: #f4f7f6; padding: 40px 20px; font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(22, 38, 96, 0.08); border: 1px solid rgba(22, 38, 96, 0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #162660 0%, #203580 100%); padding: 35px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">JadeQuest HR</h1>
          <p style="color: #D0E6FD; margin: 10px 0 0 0; font-size: 14px; font-weight: 500; opacity: 0.9;">Official Internal Announcement</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px;">
          <div style="display: inline-block; background-color: #f0f5fa; color: #162660; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 24px; border: 1px solid rgba(104, 170, 232, 0.2);">
            ${dateStr}
          </div>
          
          <h2 style="color: #162660; margin: 0 0 24px 0; font-size: 22px; font-weight: 700; line-height: 1.4;">
            ${title}
          </h2>
          
          <div style="color: #334155; font-size: 16px; line-height: 1.7;">
            <p style="margin-top: 0; font-weight: 600;">Dear Team Member,</p>
            <p style="margin-bottom: 0;">${content.replace(/\n/g, '<br>')}</p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px; line-height: 1.6;">
            <p style="margin: 0; font-weight: 700; color: #162660;">HR Department</p>
            <p style="margin: 4px 0 0 0;">JadeQuest Ltd.</p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">This is an automated notification from the JadeQuest HRMS portal.<br>Please do not reply directly to this email.</p>
        </div>
        
      </div>
    </div>
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
