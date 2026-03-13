const fs = require('fs');
const path = 'front/src/components/SeedTesterPage.vue';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /:title="\\\`Tranche \\\[\\\$\\{\\(index \* 0\.05\\)\.toFixed\\(2\\)\\}, \\\$\\{\\((\\(index \+ 1\\) \* 0\.05)\\)\.toFixed\\(2\\)\\}\\\[ : \\\$\\{count\\} résultats\\\`"/,
  ':title="`Tranche [${(index * 0.05).toFixed(2)}, ${((index + 1) * 0.05).toFixed(2)}[ : ${count} résultats`"'
);
content = content.replace(
  /:style="{ height: \\\`\\\$\\{\\(count \/ maxDistributionCount\\) \* 100\\}%\\\` }"/,
  ':style="{ height: `${(count / maxDistributionCount) * 100}%` }"'
);

// Fallback just replacing the whole block that has the escaping
content = content.replace(
  /:title="\\`Tranche \[\$\{([^}]+)\}, \$\{([^}]+)\}\[ : \$\{count\} résultats\\`"/,
  ':title="`Tranche [${$1}, ${$2}[ : ${count} résultats`"'
);
content = content.replace(
  /:style="\{ height: \\`\$\{(count \/ maxDistributionCount) \* 100\}%\\` \}"/,
  ':style="{ height: `${(count / maxDistributionCount) * 100}%` }"'
);


fs.writeFileSync(path, content, 'utf8');
console.log('SeedTesterPage fixed successfully.');
