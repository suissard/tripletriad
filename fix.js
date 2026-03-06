const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'front', 'src', 'components', 'DevOptions.vue');
let code = fs.readFileSync(filePath, 'utf8');

const regex = /async function doAutoLogin\(\) \{[\s\S]*?\}\n\}\n  \} catch \(error\) \{\n    console\.error\('Auto-login error:', error\);\n  \}\n\}/;

const fixedMethod = `async function doAutoLogin() {
  try {
    const response = await fetch('http://localhost:1337/api/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@admin.com', password: 'admin' })
    });

    if (response.ok) {
      const data = await response.json();
      setAuth(data.jwt, data.user);
      console.log('Auto-login successful.');
    } else {
      console.warn('Auto-login failed.', await response.text());
      // Bypass auth since we are in dev options
      setAuth('fake-jwt-token', { username: 'Guest Dev', email: 'guest@dev.local' });
    }
  } catch (error) {
    console.error('Auto-login error:', error);
    setAuth('fake-jwt-token', { username: 'Guest Dev', email: 'guest@dev.local' });
  }
}`;

code = code.replace(regex, fixedMethod);
fs.writeFileSync(filePath, code);
console.log('Fixed duplicate syntax');
