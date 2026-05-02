const http = require('http');

const req = http.get('http://localhost:1340/api/users/me?populate=guilds', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
  });
});
req.on('error', console.error);
