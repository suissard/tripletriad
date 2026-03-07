const fs = require('fs');
const file = 'back/strapi/src/api/user-card/controllers/user-card.ts';
let content = fs.readFileSync(file, 'utf8');

// The issue is TS compilation of Strapi typings.
// We can use any cast `(currentUserData as any).dust` to bypass strict TS in Strapi.

content = content.replace(/currentUserData\.dust/g, '(currentUserData as any).dust');
content = content.replace(/userCard\.card\?/g, '(userCard as any).card?');
content = content.replace(/data: \{ dust: newDust \}/g, 'data: { dust: newDust } as any');

fs.writeFileSync(file, content, 'utf8');
