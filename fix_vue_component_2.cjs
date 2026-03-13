const fs = require('fs');
const path = 'front/src/components/SeedTesterPage.vue';
let content = fs.readFileSync(path, 'utf8');

// The backslash escaping in the bash EOF caused the template string in Vue to have actual backslashes, causing the \u error
content = content.replace(
  /:title="\\\`Tranche \\\[\\\${\\(index \* 0\.05\\)\.toFixed\\(2\\)}, \\\${\\(\\(index \+ 1\\) \* 0\.05\\)\.toFixed\\(2\\)}\\\[ : \\\${count} résultats\\\`"/,
  ':title="`Tranche [${(index * 0.05).toFixed(2)}, ${((index + 1) * 0.05).toFixed(2)}[ : ${count} résultats`"'
);
content = content.replace(
  /:style="{ height: \\\`\\\${\\(count \/ maxDistributionCount\\) \* 100}%\\\` }"/,
  ':style="{ height: `${(count / maxDistributionCount) * 100}%` }"'
);

fs.writeFileSync(path, content, 'utf8');
console.log('SeedTesterPage fixed successfully.');
