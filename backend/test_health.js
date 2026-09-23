const https = require('https');

const options = {
  hostname: 'flavour-9mqh.onrender.com',
  port: 443,
  path: '/api/health',
  method: 'GET'
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
req.end();
