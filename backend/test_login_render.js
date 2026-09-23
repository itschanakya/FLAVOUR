const http = require('http');
const https = require('https');

const data = JSON.stringify({
  email: 'admin',
  password: 'Admin@123',
  expectedRole: 'ADMIN'
});

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

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${body}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
