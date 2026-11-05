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

/**
 * Sends a formal Military-manner Daily Reminder Email to the ANO for unsubmitted / balance countersigned bills
 */
async function sendAnoBillReminderEmail(email, data) {
  const {
    institutionName,
    anoName,
    unitName,
    unitCode,
    monthLabel,
    demands = [],
    totalPackets = 0,
    totalAmount = 0
  } = data;

  const subject = `[IMMEDIATE] Pending Submission of Countersigned Refreshment Bill(s) for ${monthLabel} - ${unitCode || unitName}`;
  const refDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const rowsHtml = demands.map((d, idx) => {
    const dt = d.demand_date ? new Date(d.demand_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : '-';
    const amt = Number(d.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return `
      <tr>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; font-size: 12px;">${d.demand_number || '-'}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 12px;">${dt}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; color: #1d4ed8; text-align: center; font-size: 12px;">${d.invoice_no || 'ISSUED'}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; font-size: 12px;">${Number(d.total_quantity || 0).toLocaleString('en-IN')}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; font-size: 12px;">₹${amt}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 28px; border: 2px solid #1e293b; border-radius: 8px; background-color: #ffffff; color: #0f172a;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #b91c1c; text-transform: uppercase;">
            TELE / EMAIL MESSAGE • PRIORITY: IMMEDIATE
          </div>
          <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
            OFFICE OF THE OFFICER COMMANDING, ${unitName || 'NCC UNIT'}
          </h2>
        </div>
        <div style="text-align: right; font-size: 12px; font-weight: 700; color: #334155;">
          Date: ${refDate}
        </div>
      </div>

      <table style="width: 100%; margin-bottom: 18px; font-size: 13px; line-height: 1.5;">
        <tr>
          <td style="width: 70px; font-weight: 800; vertical-align: top; color: #475569;">To:</td>
          <td style="font-weight: 700; color: #0f172a;">
            The Associate NCC Officer (ANO) / CTO (${anoName || 'In-Charge'})<br/>
            <span style="text-transform: uppercase; font-weight: 800;">${institutionName}</span>
          </td>
        </tr>
      </table>

      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 10px 14px; margin-bottom: 18px; font-size: 13px; font-weight: 800; color: #991b1b; text-transform: uppercase;">
        SUB: NON-SUBMISSION OF COUNTERSIGNED REFRESHMENT BILL(S) FOR THE MONTH OF ${monthLabel}
      </div>

      <p style="font-size: 13.5px; line-height: 1.6; color: #1e293b; margin: 0 0 12px 0;">
        1. Refer to the Cadet Refreshment supplies delivered to your institution during the month of <strong>${monthLabel}</strong>.
      </p>
      <p style="font-size: 13.5px; line-height: 1.6; color: #1e293b; margin: 0 0 14px 0;">
        2. Perusal of Unit records reveals that the physical Refreshment Bill(s) / Tax Invoice(s), <strong>duly countersigned by the Head of Institution / Principal</strong>, in respect of your institution are <strong>still awaited (Balance for Submission)</strong> at this Unit as per details appended below:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; color: #1e293b;">
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">S.No</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Demand Ref</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Supply Date</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Invoice No.</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Packets</th>
            <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #f8fafc; font-weight: 900; font-size: 12.5px;">
            <td colspan="4" style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: right; text-transform: uppercase;">Total Outstanding Bill Return:</td>
            <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: center; color: #1d4ed8;">${Number(totalPackets).toLocaleString('en-IN')} Pkts</td>
            <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">₹${Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>

      <p style="font-size: 13.5px; line-height: 1.6; color: #1e293b; margin: 14px 0;">
        3. Non-receipt of the above countersigned bills is holding up the consolidated Unit refreshment bill claim processing. You are therefore requested to accord <strong>TOP PRIORITY</strong> and forward the physical bills duly countersigned by the Principal to the Unit Office immediately.
      </p>
      <p style="font-size: 12.5px; line-height: 1.5; color: #475569; margin: 12px 0 20px 0; font-style: italic;">
        (Note: Automated daily reminders will continue until the physical bill is received and taken on charge by the NCC Unit.)
      </p>

      <div style="border-top: 1px solid #cbd5e1; padding-top: 14px; display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #0f172a;">
        <div>Jai Hind,</div>
        <div style="text-align: right;">
          Sd/-<br/>
          <strong>Officer Commanding</strong><br/>
          ${unitName || 'NCC Unit'}
        </div>
      </div>
    </div>
  `;

  const textContent = `PRIORITY: IMMEDIATE\nFrom: Officer Commanding, ${unitName}\nTo: ANO/CTO, ${institutionName}\nSub: Non-Submission of Countersigned Refreshment Bills for ${monthLabel}\n\nTotal Pending Packets: ${totalPackets} | Total Amount: Rs. ${totalAmount}.\nPlease submit the physical refreshment bill(s) duly countersigned by your Principal to the NCC Unit Office immediately.`;

  return sendEmailSafely(email, subject, htmlContent, textContent);
}

/**
 * Sends a formal Military Acknowledgement & Appreciation Email to the ANO once the Unit marks their monthly bill as RECEIVED
 */
async function sendAnoBillReceivedConfirmationEmail(email, data) {
  const {
    institutionName,
    anoName,
    unitName,
    unitCode,
    monthLabel,
    receivedDate,
    totalPackets = 0,
    totalAmount = 0,
    remarks = ''
  } = data;

  const subject = `[RECEIVED] Acknowledgement of Countersigned Refreshment Bill(s) for ${monthLabel} - ${unitCode || unitName}`;
  const fmtDate = receivedDate
    ? new Date(receivedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 28px; border: 2px solid #065f46; border-radius: 8px; background-color: #ffffff; color: #0f172a;">
      <div style="border-bottom: 2px solid #065f46; padding-bottom: 14px; margin-bottom: 18px;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #059669; text-transform: uppercase;">
          OFFICIAL ACKNOWLEDGEMENT • BILL RETURN RECEIVED
        </div>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
          OFFICE OF THE OFFICER COMMANDING, ${unitName || 'NCC UNIT'}
        </h2>
      </div>

      <p style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
        To: The Associate NCC Officer (ANO) / CTO (${anoName || 'In-Charge'}), <strong>${institutionName}</strong>
      </p>

      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; font-weight: 800; color: #065f46; text-transform: uppercase;">
        SUB: ACKNOWLEDGEMENT OF RECEIPT OF COUNTERSIGNED REFRESHMENT BILL(S) FOR ${monthLabel}
      </div>

      <p style="font-size: 13.5px; line-height: 1.6; color: #1e293b; margin: 0 0 14px 0;">
        1. It is hereby confirmed that the physical Refreshment Bill(s) / Tax Invoice(s) for the month of <strong>${monthLabel}</strong>, duly countersigned by the Head of Institution / Principal of <strong>${institutionName}</strong>, have been <strong>RECEIVED</strong> at this Unit on <strong>${fmtDate}</strong>.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #475569; font-weight: 700;">Billing Month:</td>
            <td style="padding: 5px 0; color: #0f172a; font-weight: 800; text-align: right;">${monthLabel}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #475569; font-weight: 700;">Total Refreshment Packets:</td>
            <td style="padding: 5px 0; color: #1d4ed8; font-weight: 800; text-align: right;">${Number(totalPackets).toLocaleString('en-IN')} Packets</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #475569; font-weight: 700;">Verified Bill Amount:</td>
            <td style="padding: 5px 0; color: #059669; font-weight: 900; text-align: right;">₹${Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #475569; font-weight: 700;">Status at Unit:</td>
            <td style="padding: 5px 0; color: #059669; font-weight: 900; text-align: right;">✓ RECEIVED & TAKEN ON CHARGE</td>
          </tr>
          ${remarks ? `<tr><td style="padding: 5px 0; color: #475569; font-weight: 700;">Unit Remarks:</td><td style="padding: 5px 0; color: #334155; font-weight: 600; text-align: right;">${remarks}</td></tr>` : ''}
        </table>
      </div>

      <p style="font-size: 13.5px; line-height: 1.6; color: #1e293b; margin: 14px 0 20px 0;">
        2. Thank you for your timely cooperation and compliance. Automated daily reminders for the month of <strong>${monthLabel}</strong> have now been closed for your institution.
      </p>

      <div style="border-top: 1px solid #cbd5e1; padding-top: 14px; display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #0f172a;">
        <div>Jai Hind,</div>
        <div style="text-align: right;">
          Sd/-<br/>
          <strong>Officer Commanding</strong><br/>
          ${unitName || 'NCC Unit'}
        </div>
      </div>
    </div>
  `;

  const textContent = `OFFICIAL ACKNOWLEDGEMENT\nFrom: Officer Commanding, ${unitName}\nTo: ANO/CTO, ${institutionName}\n\nYour countersigned Refreshment Bill(s) for ${monthLabel} (${totalPackets} Packets, Rs. ${totalAmount}) have been RECEIVED at the NCC Unit on ${fmtDate}. Thank you for your cooperation. Jai Hind.`;

  return sendEmailSafely(email, subject, htmlContent, textContent);
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetSuccessEmail,
  sendUpdateNotificationEmail,
  sendAnoBillReminderEmail,
  sendAnoBillReceivedConfirmationEmail
};
