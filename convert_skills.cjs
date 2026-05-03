const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, 'shared/skills');
const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  if (file === 'index.js' || file === 'SkillRegistry.js') {
    return; // Handle manually
  }
  
  let content = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
  
  content = `import { SkillHandler, SkillContext } from './types';\n\n` + content;
  content = content.replace(/export default \{/, 'const handler: SkillHandler = {');
  content += '\nexport default handler;\n';
  
  content = content.replace(/([a-zA-Z]+)\(ctx\)/g, '$1(ctx: any)'); // fallback to any to avoid complex TS errors for now
  
  // Try to fix some common data access patterns safely
  content = content.replace(/\.data\.values/g, '.values');
  
  const tsFile = file.replace('.js', '.ts');
  fs.writeFileSync(path.join(skillsDir, tsFile), content);
  fs.unlinkSync(path.join(skillsDir, file));
});

console.log('Conversion complete');
