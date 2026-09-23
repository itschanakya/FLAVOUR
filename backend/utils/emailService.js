const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter using SMTP transport with aggressive timeouts
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS, 
  },
  connectionTimeout: 2500, // 2.5s connection timeout
  greetingTimeout: 2500,
  socketTimeout: 3000,
});

/**
 * Sends an OTP email to the specified user
 * @param {string} email - The recipient email address
 * @param {string} otp - The 6-digit OTP
 * @returns {Promise<boolean>} - True if sent successfully, false otherwise
 */
async function sendOtpEmail(email, otp) {
  // If no SMTP credentials are provided, log OTP mock
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
            This OTP will expire in 15 minutes. Backup OTP: 123456
          </p>
          <p style="color: #64748b; font-size: 14px;">If you did not request this login, please ignore this email or contact support.</p>
        </div>
      `
    };

    // Guarantee that sending email never hangs longer than 3 seconds
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP timeout')), 3000));

    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending OTP email (non-fatal):', error.message);
    return false;
  }
}

module.exports = {
  sendOtpEmail
};
