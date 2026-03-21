const fetch = require('node-fetch');

async function run() {
  const loginRes = await fetch('http://localhost:1337/api/auth/local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'player', password: 'password' }) // Replace with common test credentials or read from somewhere
  });
  
  // Actually, I don't know the user's password.
  console.log("Need password...");
}
run();
