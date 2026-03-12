const http = require('http');

const data = JSON.stringify({
  username: "TestAdminUser",
  email: "admin@gmail.com",
  password: "Password123456789!"
});

const options = {
  hostname: 'localhost',
  port: 1337,
  path: '/api/auth/local/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
