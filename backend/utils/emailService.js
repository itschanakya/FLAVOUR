const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail as default, can be overridden by SMTP_HOST
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
});

/**
 * Sends an OTP email to the specified user
 * @param {string} email - The recipient email address
 * @param {string} otp - The 6-digit OTP
 * @returns {Promise<boolean>} - True if sent successfully, false otherwise
 */
async function sendOtpEmail(email, otp) {
  // If no SMTP credentials are provided, we just log the OTP for testing purposes
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[OTP MOCK] Sending OTP ${otp} to ${email}`);
    return true; 
  }

  try {
    const mailOptions = {
      from: `"NCC Refreshment Portal" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Login OTP - NCC Refreshment Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #1e293b; text-align: center;">NCC Refreshment Portal</h2>
          <p style="color: #475569; font-size: 16px;">Hello,</p>
          <p style="color: #475569; font-size: 16px;">You are trying to log in to the NCC Refreshment Portal. Please use the following One-Time Password (OTP) to complete your login:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 15px 30px; background-color: #f1f5f9; color: #0f172a; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #ef4444; font-size: 14px; text-align: center; font-weight: bold;">
            This OTP will expire in 5 minutes.
          </p>
          <p style="color: #64748b; font-size: 14px;">If you did not request this login, please ignore this email or contact support.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

module.exports = {
  sendOtpEmail
};
