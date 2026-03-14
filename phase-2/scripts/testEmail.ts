import { sendTestEmail } from '../src/services/emailService';

async function run() {
  try {
    const to = 'aravinthrajramalingam@gmail.com';
    console.log(`Sending test email to ${to}...`);
    await sendTestEmail(to);
    console.log('✅ Test email sent successfully.');
  } catch (err: any) {
    console.error('❌ Failed to send test email:');
    console.error(err.message);
  }
}

run();
