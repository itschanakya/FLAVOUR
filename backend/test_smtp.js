require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'praveenkumar3871h@gmail.com',
      pass: 'pumttbfhhpwcppmj'
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"Test Server" <praveenkumar3871h@gmail.com>',
      to: 'praveenkumar3871h@gmail.com',
      subject: 'SMTP Test Email',
      text: 'This is a test to verify SMTP credentials.',
    });
    console.log('Success! Email sent. Message ID:', info.messageId);
  } catch (error) {
    console.error('Failed to send email:', error.message);
    console.error(error);
  }
}

testEmail();
