const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, 'shared/skills');
const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  if (file === 'index.js' || file === 'SkillRegistry.js') {
    return; // Handle manually
  }
  
  let content = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
  
  // Basic TS conversion
  content = `import { SkillHandler, SkillContext } from './types';\n\n` + content;
  
  // Replace export default { ... } with const handler: SkillHandler = { ... } export default handler;
  content = content.replace(/export default \{/, 'const handler: SkillHandler = {');
  content += '\nexport default handler;\n';
  
  // Replace ctx arguments
  content = content.replace(/([a-zA-Z]+)\(ctx\)/g, '$1(ctx: SkillContext)');
  
  // Replace .data.values with .values
  content = content.replace(/\.data\.values/g, '.values');
  // Replace .data with directly accessing card properties where possible, but this is risky
  // Instead of replacing all .data, we might just typecast or let any.
  
  // Save as .ts
  const tsFile = file.replace('.js', '.ts');
  fs.writeFileSync(path.join(skillsDir, tsFile), content);
  fs.unlinkSync(path.join(skillsDir, file));
});

console.log('Conversion complete');
