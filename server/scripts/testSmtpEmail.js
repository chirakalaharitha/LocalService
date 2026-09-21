const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables - prioritize server/.env
const serverEnvPath = path.join(__dirname, '../.env');
const rootEnvPath = path.join(__dirname, '../../.env');

let loadedEnv = null;
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  loadedEnv = rootEnvPath;
}
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath, override: true });
  loadedEnv = serverEnvPath;
}

const { verifyEmailTransporter, sendTestEmail } = require('../services/emailService');

const runSmtpDiagnostic = async () => {
  console.log('\n======================================================');
  console.log('   LOCALFIX – SMTP & EMAIL VERIFICATION DIAGNOSTIC   ');
  console.log('======================================================\n');

  console.log(`[ENV] Authoritative file loaded: ${loadedEnv || 'None'}`);
  console.log(`[ENV] SMTP_HOST: ${process.env.SMTP_HOST || 'not configured'}`);
  console.log(`[ENV] SMTP_PORT: ${process.env.SMTP_PORT || 'not configured'}`);
  console.log(`[ENV] SMTP_USER: ${process.env.SMTP_USER ? 'configured (' + process.env.SMTP_USER + ')' : 'not configured (EMPTY)'}`);
  console.log(`[ENV] SMTP_PASS: ${process.env.SMTP_PASS ? 'configured (' + process.env.SMTP_PASS.length + ' chars)' : 'not configured (EMPTY)'}`);
  console.log(`[ENV] SMTP_FROM: ${process.env.SMTP_FROM || 'not configured'}`);

  const hasCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_USER.trim() && process.env.SMTP_PASS && process.env.SMTP_PASS.trim());

  if (!hasCredentials) {
    console.log('\n[RESULT] SMTP Configuration: INCOMPLETE');
    console.log('         SMTP_USER or SMTP_PASS is empty in server/.env.');
    console.log('         Real outgoing email requires valid credentials.');
    return {
      configured: false,
      connected: false,
      reason: 'SMTP_USER or SMTP_PASS is empty in server/.env'
    };
  }

  console.log('\n[TEST] Verifying SMTP transporter connection to mail server...');
  const result = await verifyEmailTransporter();

  if (result.ready) {
    console.log('\n[PASS] SMTP transporter connection successful!');
    console.log('[TEST] Sending test verification email...');
    const testSend = await sendTestEmail();
    if (testSend.success) {
      console.log(`[PASS] Test email accepted by SMTP server! Message ID: ${testSend.messageId}`);
      return { configured: true, connected: true, sent: true };
    } else {
      console.error(`[FAIL] Test email send failed: ${testSend.error} (code: ${testSend.code})`);
      return { configured: true, connected: true, sent: false, error: testSend.error };
    }
  } else {
    console.error(`\n[FAIL] SMTP transporter verification failed: ${result.error} (code: ${result.code})`);
    return { configured: true, connected: false, error: result.error, code: result.code };
  }
};

runSmtpDiagnostic().then((res) => {
  console.log('\n======================================================');
  console.log('   DIAGNOSTIC SUMMARY: ' + (res.connected ? 'READY' : 'ACTION REQUIRED'));
  console.log('======================================================\n');
  process.exit(0);
});
