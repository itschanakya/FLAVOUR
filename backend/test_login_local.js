const http = require('http');

const data = JSON.stringify({
  email: 'ADMIN',
  password: 'password123',
  expectedRole: 'ADMIN'
});

const options = {
  hostname: 'localhost',
  port: 10001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
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
