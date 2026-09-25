require('dotenv').config();
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const smtpUser = process.env.SMTP_USER || 'praveenkumar3871h@gmail.com';
const smtpPass = process.env.SMTP_PASS || 'pumttbfhhpwcppmj';

let transporter = null;
if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000
  });
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends an OTP email to the specified user via Nodemailer SMTP or Resend
 * @param {string} email - The recipient email address
 * @param {string} otp - The 6-digit OTP
 * @returns {Promise<boolean>} - True if sent successfully, false otherwise
 */
async function sendOtpEmail(email, otp) {
  if (!email || !email.includes('@')) {
    console.warn(`[OTP] Invalid email address: ${email}`);
    return false;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px;">FLAVOUR BASE INDIA</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600;">NCC Refreshment Demand & Supply Portal</p>
      </div>

      <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">Hello,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
          Your One-Time Password (OTP) for authenticating into the NCC Refreshment Portal is:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; padding: 14px 28px; background-color: #0f172a; color: #38bdf8; font-size: 32px; font-weight: 800; letter-spacing: 6px; border-radius: 8px; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <p style="color: #ef4444; font-size: 13px; text-align: center; font-weight: 600; margin: 12px 0 0 0;">
          ⚠️ This OTP is valid for 15 minutes. Do not share it with anyone.
        </p>
      </div>

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
        If you did not request this login attempt, please notify your Unit Admin immediately.
      </p>
    </div>
  `;

  // 1. Try sending via Gmail SMTP (delivers to any address: gmail, yahoo, custom domain)
  if (transporter) {
    try {
      const textContent = `Hello,\n\nYour One-Time Password (OTP) for authenticating into the NCC Refreshment Portal is: ${otp}\n\nThis OTP is valid for 15 minutes. Do not share it with anyone.\n\nNational Cadet Corps Refreshment Demand & Supply Portal`;
      const info = await transporter.sendMail({
        from: `"NCC Refreshment Portal" <${smtpUser}>`,
        to: email,
        replyTo: smtpUser,
        subject: `Your Login OTP: ${otp} - NCC Refreshment Portal`,
        text: textContent,
        html: htmlContent,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'Importance': 'high'
        }
      });
      console.log(`[OTP] Email delivered to ${email} via SMTP. MessageId: ${info.messageId}`);
      return true;
    } catch (smtpErr) {
      console.error(`[OTP SMTP Error] Failed to send to ${email}:`, smtpErr.message);
    }
  }

  // 2. Fallback to Resend if SMTP fails
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'NCC Refreshment Portal <onboarding@resend.dev>',
        to: [email],
        subject: `Login OTP: ${otp} - NCC Refreshment Portal`,
        html: htmlContent
      });
      if (!error) {
        console.log(`[OTP] Email sent via Resend fallback. ID: ${data?.id}`);
        return true;
      }
      console.error('[OTP Resend Fallback Error]:', error);
    } catch (resendErr) {
      console.error('[OTP Resend Exception]:', resendErr.message);
    }
  }

  console.log(`[OTP BACKUP] No email delivered. Emergency Code: 562101 for ${email}`);
  return false;
}

module.exports = {
  sendOtpEmail
};
