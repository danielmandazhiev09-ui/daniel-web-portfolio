const http = require('http');

const data = JSON.stringify({
  name: 'Test User',
  phone: '+359887123456',
  address: 'ул. Тест 1, София',
  senderEmail: 'test.user@example.com',
  service: 'Почистване диван'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try{ console.log('Response:', JSON.parse(body)); }
    catch(e){ console.log('Response body:', body); }
  });
});

req.on('error', (e) => { console.error('Request error', e); });
req.write(data);
req.end();
