const https = require('https');

const data = JSON.stringify({ email: 'ADMIN', password: 'Admin@123', expectedRole: 'ADMIN' });

const options = {
  hostname: 'flavour-9mqh.onrender.com',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
