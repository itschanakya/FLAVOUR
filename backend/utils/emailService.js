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
 * Universal helper function to send emails safely.
 * Tries Resend FIRST (for instant production reliability), falls back to Nodemailer (for local testing).
 */
async function sendEmailSafely(toEmail, subject, htmlContent, textContent) {
  if (!toEmail || !toEmail.includes('@')) {
    console.warn(`[Email System] Invalid email address rejected: ${toEmail}`);
    return false;
  }

  let emailSent = false;

  // STEP 1: Always try Resend API first (Fastest, avoids Render SMTP blocks)
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'NCC Refreshment Portal <no-reply@flavourbaseindia.org>',
        to: [toEmail],
        subject: subject,
        html: htmlContent,
        text: textContent
      });

      if (!error) {
        console.log(`[Email System] 🚀 Sent successfully via Resend to ${toEmail}. ID: ${data?.id}`);
        return true; // Stop here if successful
      }
      console.warn(`[Email System] ⚠️ Resend rejected it. Trying fallback... Error:`, error);
    } catch (err) {
      console.warn(`[Email System] ⚠️ Resend exception. Trying fallback... Error:`, err.message);
    }
  }

  // STEP 2: Fallback to Nodemailer SMTP (Works well on localhost)
  if (transporter && !emailSent) {
    try {
      const info = await transporter.sendMail({
        from: `"NCC Refreshment Portal" <${smtpUser}>`,
        to: toEmail,
        replyTo: smtpUser,
        subject: subject,
        text: textContent,
        html: htmlContent,
        priority: 'high'
      });
      console.log(`[Email System] 📧 Sent successfully via Gmail SMTP to ${toEmail}. ID: ${info.messageId}`);
      return true;
    } catch (smtpErr) {
      console.error(`[Email System] ❌ Gmail SMTP also failed for ${toEmail}:`, smtpErr.message);
    }
  }

  console.error(`[Email System] 🚨 CRITICAL: All email methods failed for ${toEmail}.`);
  return false;
}

/**
 * Sends an OTP email to the specified user
 */
async function sendOtpEmail(email, otp) {
  const subject = `Your Login OTP: ${otp} - NCC Refreshment Portal`;
  const textContent = `Hello,\n\nYour One-Time Password (OTP) for authenticating into the NCC Refreshment Portal is: ${otp}\n\nThis OTP is valid for 15 minutes. Do not share it with anyone.`;
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
    </div>
  `;
  return sendEmailSafely(email, subject, htmlContent, textContent);
}

/**
 * Sends a Password Reset OTP email
 */
async function sendPasswordResetOtpEmail(email, otp) {
  const subject = `Password Reset OTP: ${otp} - NCC Refreshment Portal`;
  const textContent = `Hello,\n\nYour Password Reset OTP is: ${otp}\n\nThis code is valid for 15 minutes. Do not share it with anyone.`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;">FLAVOUR BASE INDIA</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600;">NCC Refreshment Demand & Supply Portal</p>
      </div>
      <div style="padding: 24px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
        <div style="display: inline-block; padding: 4px 10px; background-color: #fee2e2; color: #dc2626; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 12px;">
          PASSWORD RESET REQUEST
        </div>
        <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">Hello,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          We received a request to reset your password. Please use the following 6-digit OTP to proceed:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; padding: 14px 28px; background-color: #0f172a; color: #38bdf8; font-size: 32px; font-weight: 800; letter-spacing: 6px; border-radius: 8px; font-family: monospace;">
            ${otp}
          </span>
        </div>
        <p style="color: #dc2626; font-size: 13px; text-align: center; font-weight: 600; margin: 12px 0 0 0;">
          ⚠️ This OTP is valid for 15 minutes. Never share this code with anyone.
        </p>
      </div>
    </div>
  `;
  return sendEmailSafely(email, subject, htmlContent, textContent);
}

/**
 * Sends a confirmation email with the Login ID and newly set password
 */
async function sendPasswordResetSuccessEmail(email, loginId, newPassword) {
  const subject = `Your Updated Login Credentials - NCC Refreshment Portal`;
  const textContent = `Hello,\n\nYour password has been updated.\nLogin ID: ${loginId}\nNew Password: ${newPassword}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;">FLAVOUR BASE INDIA</h2>
      </div>
      <div style="padding: 24px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
        <div style="display: inline-block; padding: 4px 10px; background-color: #dcfce7; color: #15803d; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 12px;">
          ✓ PASSWORD UPDATED SUCCESSFULLY
        </div>
        <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">Hello,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Your password has been successfully updated.
        </p>
        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600; width: 120px;">Login ID:</td>
              <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 700;">${loginId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">New Password:</td>
              <td style="padding: 6px 0; color: #2563eb; font-size: 14px; font-weight: 700;">${newPassword}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="https://flavourbaseindia.org" style="display: inline-block; padding: 10px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; border-radius: 6px;">
            Go to Portal Sign In
          </a>
        </div>
      </div>
    </div>
  `;
  return sendEmailSafely(email, subject, htmlContent, textContent);
}

/**
 * Sends an update notification email
 */
async function sendUpdateNotificationEmail(email, data) {
  const { institutionName, updatedBy, changes, timestamp } = data;
  const subject = `Institution Updated: ${institutionName} - NCC Refreshment Portal`;
  const timeStr = timestamp
    ? new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const changesHtml = Object.entries(changes || {})
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;width:160px;">${k}:</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;">${v}</td></tr>`)
    .join('');

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="color:#0f172a;margin:0;font-size:22px;font-weight:800;">FLAVOUR BASE INDIA</h2>
      </div>
      <div style="padding:20px;background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;margin-bottom:16px;">
        <div style="display:inline-block;padding:4px 10px;background:#dcfce7;color:#15803d;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:12px;">✓ INSTITUTION DATA UPDATED</div>
        <p style="color:#334155;font-size:15px;margin:0 0 8px 0;font-weight:700;">${institutionName}</p>
        <p style="color:#475569;font-size:13px;margin:0 0 16px 0;">Updated by: <strong>${updatedBy}</strong> on ${timeStr} (IST)</p>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">${changesHtml}</table>
        </div>
      </div>
    </div>
  `;
  const textContent = `Institution ${institutionName} updated by ${updatedBy} on ${timeStr}.`;
  
  return sendEmailSafely(email, subject, htmlContent, textContent);
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetSuccessEmail,
  sendUpdateNotificationEmail
};
