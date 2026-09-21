const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Ensure authoritative environment variables are loaded
const serverEnvPath = path.join(__dirname, '../.env');
const rootEnvPath = path.join(__dirname, '../../.env');
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
if (fs.existsSync(serverEnvPath)) dotenv.config({ path: serverEnvPath, override: true });

/**
 * Creates and returns configured Nodemailer SMTP transporter
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const isSecure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure, // false for port 587 (uses STARTTLS)
    auth: {
      user: (process.env.SMTP_USER || '').trim(),
      pass: (process.env.SMTP_PASS || '').trim()
    },
    tls: {
      rejectUnauthorized: false
    },
    // Safe timeouts to avoid hanging requests if SMTP host is blocked/slow
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
};

/**
 * Diagnostic step: Verify SMTP credentials and connection
 */
const verifyEmailTransporter = async () => {
  const hasUser = Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim());
  const hasPass = Boolean(process.env.SMTP_PASS && process.env.SMTP_PASS.trim());

  if (!hasUser || !hasPass) {
    console.warn('[EMAIL DIAGNOSTIC] SMTP credentials (SMTP_USER or SMTP_PASS) not configured in server/.env');
    return { ready: false, error: 'SMTP credentials not configured in server/.env' };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log(`[EMAIL READY] SMTP transporter connection verified with ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || 587}`);
    return { ready: true };
  } catch (error) {
    console.error('[EMAIL ERROR] SMTP connection verification failed:', error.message);
    return { ready: false, error: error.message, code: error.code };
  }
};

/**
 * Real email delivery function using Nodemailer
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!to) {
      return { success: false, error: 'Recipient email is missing' };
    }

    const hasUser = Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim());
    const hasPass = Boolean(process.env.SMTP_PASS && process.env.SMTP_PASS.trim());

    if (!hasUser || !hasPass) {
      console.error(`[EMAIL CONFIG ERROR] Cannot send email to ${to}: SMTP_USER or SMTP_PASS is missing in server/.env`);
      return {
        success: false,
        error: 'Email service is not configured on the server. Please configure SMTP_USER and SMTP_PASS in server/.env.'
      };
    }

    console.log(`[EMAIL] Sending verification email to: ${to}`);

    const transporter = createTransporter();
    const fromAddress = process.env.SMTP_FROM || `LocalFix <${process.env.SMTP_USER.trim()}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || subject,
      html
    });

    console.log(`[EMAIL] Verification email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Verification email delivery failed:', {
      to,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      message: error.message
    });
    return { success: false, error: error.message, code: error.code };
  }
};

/**
 * Safe test email function
 */
const sendTestEmail = async (recipient) => {
  const targetEmail = recipient || process.env.SMTP_USER;
  if (!targetEmail) {
    return { success: false, error: 'No recipient email specified' };
  }
  return sendEmail({
    to: targetEmail,
    subject: 'LocalFix SMTP Test Verification',
    text: 'This is a test email sent from LocalFix Smart Civic Platform to verify Nodemailer SMTP delivery.',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #38bdf8; margin-top: 0;">LocalFix SMTP Connection Verified</h2>
        <p>Your Nodemailer SMTP transport is configured correctly and able to dispatch live emails.</p>
        <p style="font-size: 12px; color: #94a3b8;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `
  });
};

/**
 * Branded transactional notification email
 */
const sendNotificationEmail = async ({ to, recipientName, type, title, message, request }) => {
  if (!to) return { success: false, error: 'No recipient email specified' };

  const subject = `LocalFix – ${title}`;
  const reqId = request?.requestId || (typeof request === 'string' ? request : null);
  const reqStatus = request?.status ? request.status.replace(/_/g, ' ') : null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">LocalFix</span>
                    <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 500; margin-top: 2px;">Smart Civic Service Platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #f8fafc;">${title}</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Hello <strong>${recipientName || 'Citizen'}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                ${message}
              </p>

              ${reqId ? `
              <!-- Request Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Service Request</div>
                    <div style="font-size: 15px; font-weight: 700; color: #38bdf8;">${reqId}</div>
                    ${reqStatus ? `<div style="font-size: 13px; color: #a5f3fc; margin-top: 4px;">Status: <strong>${reqStatus}</strong></div>` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                You are receiving this notification because email alerts are enabled on your LocalFix profile.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <span style="font-size: 11px; color: #64748b;">
                &copy; ${new Date().getFullYear()} LocalFix Civic Services. All rights reserved.
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    text: `${title}\n\n${message}${reqId ? `\nRequest ID: ${reqId}` : ''}`,
    html
  });
};

/**
 * Branded Password Reset OTP email
 */
const sendPasswordResetOtpEmail = async ({ to, recipientName, otp }) => {
  if (!to || !otp) return { success: false, error: 'Recipient and OTP are required' };

  const subject = 'LocalFix Password Reset OTP';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LocalFix Password Reset</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #090d16; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 540px; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellpadding="0" cellspacing="0">
          <!-- Header with Gradient Bar -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
              <table width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: linear-gradient(135deg, #2563eb, #14b8a6); border-radius: 10px; font-weight: 900; color: #ffffff; font-size: 16px; margin-bottom: 8px;">LF</div>
                    <span style="display: block; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">LocalFix</span>
                    <span style="display: block; font-size: 10px; color: #38bdf8; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;">Smart Civic Service Platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #f8fafc;">Password Reset Request</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong>${recipientName || 'Citizen'}</strong>,<br>
                We received a request to reset the password for your LocalFix account. Use the 6-digit verification code below:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #020617; border-radius: 14px; border: 1px solid #334155; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your Verification Code</span>
                <span style="display: block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.3);">${otp}</span>
                <span style="display: block; font-size: 12px; color: #f59e0b; font-weight: 600; margin-top: 10px;">⏰ This OTP expires in 5 minutes</span>
              </div>

              <div style="background-color: #1e293b/60; border-left: 3px solid #38bdf8; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                  <strong>Security Reminder:</strong> Do not share this OTP with anyone, including municipal officials. If you did not initiate this request, you can safely ignore this email; your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center;">
              <span style="font-size: 11px; color: #64748b;">
                &copy; ${new Date().getFullYear()} LocalFix Civic Services. Protecting municipal data and citizen privacy.
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    text: `Your LocalFix password reset OTP is: ${otp}\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.`,
    html
  });
};

/**
 * Branded Citizen Account Email Verification OTP email
 */
const sendEmailVerificationOtp = async ({ to, recipientName, otp }) => {
  if (!to || !otp) return { success: false, error: 'Recipient and OTP are required' };

  const subject = 'LocalFix Email Verification';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LocalFix Email Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #090d16; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 540px; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellpadding="0" cellspacing="0">
          <!-- Header with Gradient Bar -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
              <table width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: linear-gradient(135deg, #2563eb, #14b8a6); border-radius: 10px; font-weight: 900; color: #ffffff; font-size: 16px; margin-bottom: 8px;">LF</div>
                    <span style="display: block; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">LocalFix</span>
                    <span style="display: block; font-size: 10px; color: #38bdf8; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;">Smart Civic Service Platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #f8fafc;">Email Verification</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong>${recipientName || 'Citizen'}</strong>,<br>
                Thank you for joining LocalFix. Your verification code is:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #020617; border-radius: 14px; border: 1px solid #334155; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your Verification Code</span>
                <span style="display: block; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.3);">${otp}</span>
                <span style="display: block; font-size: 12px; color: #f59e0b; font-weight: 600; margin-top: 10px;">⏰ This code expires in 5 minutes</span>
              </div>

              <div style="background-color: #1e293b/60; border-left: 3px solid #14b8a6; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                  <strong>Important:</strong> Do not share this code with anyone. Enter this code on the account verification page to activate your citizen account.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center;">
              <span style="font-size: 11px; color: #64748b;">
                &copy; ${new Date().getFullYear()} LocalFix Civic Services. Empowering citizens for responsive municipal services.
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    text: `LocalFix\nEmail Verification\n\nYour verification code is:\n${otp}\n\nThis code expires in 5 minutes.\n\nDo not share this code with anyone.`,
    html
  });
};

/**
 * Helper to build standard LocalFix branded email layout
 */
const buildEmailTemplate = ({ headerTitle, title, recipientName, bodyHtml, actionText, actionUrl }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #090d16; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #0f172a; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
              <table width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 34px; height: 34px; line-height: 34px; text-align: center; background: linear-gradient(135deg, #2563eb, #14b8a6); border-radius: 10px; font-weight: 900; color: #ffffff; font-size: 15px; margin-bottom: 6px;">LF</div>
                    <span style="display: block; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">LocalFix</span>
                    <span style="display: block; font-size: 10px; color: #38bdf8; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px;">Smart Civic Service Platform</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                ${headerTitle || 'Municipal Notification'}
              </div>
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #f8fafc;">${title}</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong>${recipientName || 'User'}</strong>,
              </p>
              
              ${bodyHtml}

              ${actionText && actionUrl ? `
              <div style="text-align: center; margin: 28px 0;">
                <a href="${actionUrl}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                  ${actionText}
                </a>
              </div>
              ` : ''}

              <p style="margin: 24px 0 0 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                You are receiving this real-time alert because email alerts are enabled on your LocalFix profile.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center;">
              <span style="font-size: 11px; color: #64748b;">
                &copy; ${new Date().getFullYear()} LocalFix Civic Services. Connecting Citizens, Staff, and Municipal Administration.
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Admin Email: New Citizen Service Request
 */
const sendNewRequestAdminEmail = async ({ to, adminName, request, citizen }) => {
  if (!to || !request) return { success: false, error: 'Recipient and request required' };

  const subject = 'New Service Request – LocalFix';
  const reqId = request.requestId || 'LF-REQ';
  const category = request.category || 'General';
  const priority = request.priority || 'MEDIUM';
  const location = request.address || 'Location provided';
  const description = request.description || '';
  const dateStr = request.createdAt ? new Date(request.createdAt).toLocaleString() : new Date().toLocaleString();

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      A new citizen service request has been submitted in your municipal jurisdiction and is awaiting administrative review.
    </p>

    <!-- Request Details Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Service Request ID</div>
          <div style="font-size: 16px; font-weight: 800; color: #38bdf8; margin-top: 2px;">${reqId}</div>
          
          <div style="margin-top: 12px; font-size: 13px; color: #cbd5e1;">
            <strong>Category:</strong> ${category}<br>
            <strong>Priority:</strong> <span style="color: ${priority === 'CRITICAL' ? '#ef4444' : priority === 'HIGH' ? '#f97316' : '#38bdf8'}; font-weight: 700;">${priority}</span><br>
            <strong>Location:</strong> ${location}<br>
            <strong>Reported On:</strong> ${dateStr}
          </div>

          ${citizen ? `
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #1e293b; font-size: 12px; color: #94a3b8;">
            <strong>Reporting Citizen:</strong> ${citizen.name || 'Citizen'} ${citizen.phone ? `(${citizen.phone})` : ''}
          </div>
          ` : ''}
        </td>
      </tr>
    </table>

    <div style="background-color: #1e293b; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
      <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Issue Description</div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #f1f5f9; line-height: 1.5;">${description}</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    text: `New Service Request Submitted [${reqId}]\nCategory: ${category}\nPriority: ${priority}\nLocation: ${location}\nDescription: ${description}`,
    html: buildEmailTemplate({
      headerTitle: 'New Municipal Request',
      title: `Service Request ${reqId} Submitted`,
      recipientName: adminName,
      bodyHtml
    })
  });
};

/**
 * 2. Staff Email: New Request Assigned
 */
const sendStaffAssignmentEmail = async ({ to, staffName, request, assignedAt }) => {
  if (!to || !request) return { success: false, error: 'Recipient and request required' };

  const subject = 'New Service Request Assigned – LocalFix';
  const reqId = request.requestId || 'LF-REQ';
  const category = request.category || 'General';
  const priority = request.priority || 'MEDIUM';
  const location = request.address || 'Location specified';
  const timeStr = assignedAt ? new Date(assignedAt).toLocaleString() : new Date().toLocaleString();
  const slaDeadlineStr = request.slaDeadline ? new Date(request.slaDeadline).toLocaleString() : null;

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      A new municipal service request has been assigned to you by the administrator. Please review the details below and proceed with field inspection.
    </p>

    <!-- Request Details Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Assigned Task</div>
          <div style="font-size: 16px; font-weight: 800; color: #38bdf8; margin-top: 2px;">${reqId} - ${request.title || category}</div>
          
          <div style="margin-top: 12px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
            <strong>Category:</strong> ${category}<br>
            <strong>Priority:</strong> <span style="color: ${priority === 'CRITICAL' ? '#ef4444' : priority === 'HIGH' ? '#f97316' : '#38bdf8'}; font-weight: 700;">${priority}</span><br>
            <strong>Location:</strong> ${location}<br>
            <strong>Assignment Time:</strong> ${timeStr}
            ${slaDeadlineStr ? `<br><strong>Expected Resolution (SLA):</strong> <span style="color: #f59e0b; font-weight: 700;">${slaDeadlineStr}</span>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
      Please log in to your staff dashboard to accept this task and start field operations.
    </p>
  `;

  return sendEmail({
    to,
    subject,
    text: `New Service Request Assigned: ${reqId}\nCategory: ${category}\nPriority: ${priority}\nLocation: ${location}\nAssignment Time: ${timeStr}${slaDeadlineStr ? `\nSLA Deadline: ${slaDeadlineStr}` : ''}`,
    html: buildEmailTemplate({
      headerTitle: 'Task Assignment',
      title: `Task Assigned: ${reqId}`,
      recipientName: staffName,
      bodyHtml
    })
  });
};

/**
 * 3. Citizen Email: Request In Progress
 */
const sendRequestInProgressEmail = async ({ to, citizenName, request }) => {
  if (!to || !request) return { success: false, error: 'Recipient and request required' };

  const subject = 'Service Request In Progress – LocalFix';
  const reqId = request.requestId || 'LF-REQ';
  const category = request.category || 'Civic Service';
  const location = request.address || '';

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Great news! Field personnel have accepted your service request and physical repair work is currently in progress.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Service Request</div>
          <div style="font-size: 16px; font-weight: 800; color: #38bdf8; margin-top: 2px;">${reqId}</div>
          <div style="margin-top: 8px; font-size: 13px; color: #cbd5e1;">
            <strong>Category:</strong> ${category}<br>
            ${location ? `<strong>Location:</strong> ${location}<br>` : ''}
            <strong>Status:</strong> <span style="color: #38bdf8; font-weight: 700;">IN PROGRESS</span>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
      You will receive another update once the team submits proof of completion.
    </p>
  `;

  return sendEmail({
    to,
    subject,
    text: `Your LocalFix request [${reqId}] is now being worked on by field staff.\nCategory: ${category}\nLocation: ${location}`,
    html: buildEmailTemplate({
      headerTitle: 'Repair Underway',
      title: `Request ${reqId} is Now In Progress`,
      recipientName: citizenName,
      bodyHtml
    })
  });
};

/**
 * 4. Citizen Email: Request Resolved (Awaiting Citizen Verification)
 */
const sendRequestResolvedCitizenEmail = async ({ to, citizenName, request, resolutionNotes, resolutionProof }) => {
  if (!to || !request) return { success: false, error: 'Recipient and request required' };

  const subject = 'Your LocalFix Request Has Been Resolved';
  const reqId = request.requestId || 'LF-REQ';
  const category = request.category || 'Civic Service';
  const location = request.address || '';
  const notes = resolutionNotes || request.resolutionNotes || 'Field work completed.';

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Your municipal service request has been marked as resolved by field personnel. Please review the resolution details and verify the work.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Resolution Summary</div>
          <div style="font-size: 16px; font-weight: 800; color: #10b981; margin-top: 2px;">${reqId} - Resolved</div>
          <div style="margin-top: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
            <strong>Category:</strong> ${category}<br>
            ${location ? `<strong>Location:</strong> ${location}<br>` : ''}
            <strong>Resolution Notes:</strong> <span style="color: #f1f5f9;">${notes}</span>
          </div>
        </td>
      </tr>
    </table>

    <div style="background-color: #064e3b/40; border-left: 3px solid #10b981; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #a7f3d0; line-height: 1.5;">
        <strong>Next Step:</strong> Please log in to LocalFix to inspect the before/after photos and click <strong>Verify Resolution</strong> to close the ticket and submit your feedback.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    text: `Hello ${citizenName},\n\nYour service request [${reqId}] has been marked as resolved.\nCategory: ${category}\nLocation: ${location}\nResolution: ${notes}\n\nPlease review the resolution and verify the request in your LocalFix citizen dashboard.`,
    html: buildEmailTemplate({
      headerTitle: 'Work Completed',
      title: `Service Request ${reqId} Resolved`,
      recipientName: citizenName,
      bodyHtml
    })
  });
};

/**
 * 5. Admin Email: Request Resolved by Staff
 */
const sendRequestResolvedAdminEmail = async ({ to, adminName, request, staffName, resolutionNotes }) => {
  if (!to || !request) return { success: false, error: 'Recipient and request required' };

  const subject = 'Service Request Resolved – LocalFix';
  const reqId = request.requestId || 'LF-REQ';
  const category = request.category || 'General';
  const location = request.address || '';
  const notes = resolutionNotes || request.resolutionNotes || 'Field work submitted.';

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Staff member <strong>${staffName || 'Field Staff'}</strong> has submitted completion proof and marked service request <strong>${reqId}</strong> as resolved.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Field Resolution Notice</div>
          <div style="font-size: 16px; font-weight: 800; color: #38bdf8; margin-top: 2px;">${reqId}</div>
          <div style="margin-top: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
            <strong>Resolved By:</strong> ${staffName || 'Staff'}<br>
            <strong>Category:</strong> ${category}<br>
            ${location ? `<strong>Location:</strong> ${location}<br>` : ''}
            <strong>Work Notes:</strong> ${notes}
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
      The ticket is currently awaiting citizen inspection and verification.
    </p>
  `;

  return sendEmail({
    to,
    subject,
    text: `Service Request [${reqId}] resolved by ${staffName}.\nCategory: ${category}\nLocation: ${location}\nNotes: ${notes}`,
    html: buildEmailTemplate({
      headerTitle: 'Staff Resolution',
      title: `Request ${reqId} Resolved by Staff`,
      recipientName: adminName,
      bodyHtml
    })
  });
};

/**
 * 6. Staff & Admin Email: Request Verified & Closed by Citizen
 */
const sendRequestVerifiedEmail = async ({ to, recipientName, request, role, rating, comment }) => {
  if (!to || !request) return { success: false, error: 'Recipient and request required' };

  const subject = 'Service Request Verified & Closed – LocalFix';
  const reqId = request.requestId || 'LF-REQ';
  const category = request.category || 'Civic Service';
  const location = request.address || '';

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      The reporting citizen has inspected and officially verified resolution for service request <strong>${reqId}</strong>. The request is now closed.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px 20px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Ticket Closed</div>
          <div style="font-size: 16px; font-weight: 800; color: #10b981; margin-top: 2px;">${reqId} - Verified & Closed</div>
          <div style="margin-top: 8px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
            <strong>Category:</strong> ${category}<br>
            ${location ? `<strong>Location:</strong> ${location}<br>` : ''}
            ${rating ? `<strong>Citizen Rating:</strong> ${rating} / 5 Stars<br>` : ''}
            ${comment ? `<strong>Comment:</strong> "${comment}"` : ''}
          </div>
        </td>
      </tr>
    </table>
  `;

  return sendEmail({
    to,
    subject,
    text: `Service Request [${reqId}] has been verified and closed by the citizen.${rating ? ` Rating: ${rating}/5.` : ''}`,
    html: buildEmailTemplate({
      headerTitle: 'Citizen Verification',
      title: `Request ${reqId} Closed`,
      recipientName,
      bodyHtml
    })
  });
};

/**
 * 7. Staff Email: Feedback Submitted
 */
const sendFeedbackSubmittedStaffEmail = async ({ to, staffName, request, feedback, citizenName }) => {
  if (!to || !feedback) return { success: false, error: 'Recipient and feedback required' };

  const subject = 'New Citizen Feedback – LocalFix';
  const reqId = request?.requestId || 'LF-REQ';
  const rating = feedback.rating || 5;
  const comment = feedback.comment || '';
  const suggestion = feedback.suggestion || '';

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      A citizen has submitted a performance rating and feedback for the work you completed on <strong>${reqId}</strong>.
    </p>

    <!-- Feedback Rating Card -->
    <div style="background-color: #020617; border-radius: 14px; border: 1px solid #334155; padding: 20px; text-align: center; margin-bottom: 20px;">
      <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Rating Received</span>
      <div style="font-size: 32px; font-weight: 900; color: #f59e0b; margin: 6px 0;">
        ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
      </div>
      <span style="font-size: 13px; font-weight: 700; color: #cbd5e1;">${rating} out of 5 Stars</span>
    </div>

    ${comment ? `
    <div style="background-color: #1e293b; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;">
      <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Citizen Review</div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #f1f5f9; line-height: 1.5; font-style: italic;">"${comment}"</p>
    </div>
    ` : ''}

    ${suggestion ? `
    <div style="background-color: #1e293b; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
      <div style="font-size: 11px; color: #38bdf8; font-weight: 600; text-transform: uppercase;">Improvement Suggestion</div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #f1f5f9; line-height: 1.5;">${suggestion}</p>
    </div>
    ` : ''}
  `;

  return sendEmail({
    to,
    subject,
    text: `Citizen submitted feedback for request [${reqId}].\nRating: ${rating}/5\nComment: ${comment || 'N/A'}\nSuggestion: ${suggestion || 'N/A'}`,
    html: buildEmailTemplate({
      headerTitle: 'Staff Review',
      title: `Feedback Received for ${reqId}`,
      recipientName: staffName,
      bodyHtml
    })
  });
};

/**
 * 8. Admin Email: Feedback Submitted
 */
const sendFeedbackSubmittedAdminEmail = async ({ to, adminName, request, feedback, citizenName }) => {
  if (!to || !feedback) return { success: false, error: 'Recipient and feedback required' };

  const subject = 'New Citizen Feedback – LocalFix';
  const reqId = request?.requestId || 'LF-REQ';
  const category = request?.category || 'Civic Service';
  const rating = feedback.rating || 5;
  const comment = feedback.comment || '';
  const suggestion = feedback.suggestion || '';

  const bodyHtml = `
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      New verified citizen feedback has been recorded for service request <strong>${reqId}</strong> (${category}) in your municipal jurisdiction.
    </p>

    <!-- Feedback Rating Card -->
    <div style="background-color: #020617; border-radius: 14px; border: 1px solid #334155; padding: 20px; text-align: center; margin-bottom: 20px;">
      <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Service Satisfaction Rating</span>
      <div style="font-size: 32px; font-weight: 900; color: #f59e0b; margin: 6px 0;">
        ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
      </div>
      <span style="font-size: 13px; font-weight: 700; color: #cbd5e1;">${rating} / 5 Stars (${reqId})</span>
    </div>

    ${comment ? `
    <div style="background-color: #1e293b; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;">
      <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Citizen Comment</div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #f1f5f9; line-height: 1.5; font-style: italic;">"${comment}"</p>
    </div>
    ` : ''}

    ${suggestion ? `
    <div style="background-color: #1e293b; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
      <div style="font-size: 11px; color: #38bdf8; font-weight: 600; text-transform: uppercase;">Citizen Suggestion</div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #f1f5f9; line-height: 1.5;">${suggestion}</p>
    </div>
    ` : ''}

    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
      This feedback has been added to the municipal analytics dashboard.
    </p>
  `;

  return sendEmail({
    to,
    subject,
    text: `New citizen feedback for [${reqId}].\nRating: ${rating}/5\nComment: ${comment || 'N/A'}\nSuggestion: ${suggestion || 'N/A'}`,
    html: buildEmailTemplate({
      headerTitle: 'Citizen Satisfaction',
      title: `Feedback Received: ${reqId}`,
      recipientName: adminName,
      bodyHtml
    })
  });
};

module.exports = {
  sendEmail,
  sendNotificationEmail,
  sendPasswordResetOtpEmail,
  sendEmailVerificationOtp,
  verifyEmailTransporter,
  sendNewRequestAdminEmail,
  sendStaffAssignmentEmail,
  sendRequestInProgressEmail,
  sendRequestResolvedCitizenEmail,
  sendRequestResolvedAdminEmail,
  sendRequestVerifiedEmail,
  sendFeedbackSubmittedStaffEmail,
  sendFeedbackSubmittedAdminEmail,
  sendTestEmail
};

