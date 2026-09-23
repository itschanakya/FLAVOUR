const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an OTP email to the specified user via Resend API
 * @param {string} email - The recipient email address
 * @param {string} otp - The 6-digit OTP
 * @returns {Promise<boolean>} - True if sent successfully, false otherwise
 */
async function sendOtpEmail(email, otp) {
  // If no Resend API key, log OTP mock (local dev fallback)
  if (!process.env.RESEND_API_KEY) {
    console.log(`[OTP MOCK] No RESEND_API_KEY found. OTP for ${email}: ${otp}`);
    return true;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'NCC Refreshment Portal <onboarding@resend.dev>',
      to: [email],
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
            This OTP will expire in 15 minutes.
          </p>
          <p style="color: #64748b; font-size: 14px;">If you did not request this login, please ignore this email or contact support.</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`[OTP] Email sent successfully via Resend. ID: ${data.id}`);
    return true;
  } catch (err) {
    console.error('Error sending OTP email:', err.message);
    return false;
  }
}

module.exports = {
  sendOtpEmail
};
