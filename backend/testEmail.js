require('dotenv').config();
const { Resend } = require('resend');

async function testEmail() {
  console.log('Testing Resend to a different email with the NEW API KEY...');
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'NCC Refreshment Portal <no-reply@flavourbaseindia.org>',
      to: ['jadugar3871h@gmail.com'], // The email that is failing
      subject: 'Test Resend Verification',
      text: 'If you receive this, the domain verification and API key work perfectly.'
    });
    
    if (error) {
      console.error('Resend API Error:', error);
    } else {
      console.log('Resend Success! ID:', data?.id);
    }
  } catch (err) {
    console.error('Resend Exception:', err.message);
  }
}

testEmail();
