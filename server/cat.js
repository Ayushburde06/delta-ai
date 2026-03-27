const fs = require('fs');
const content = typeof process.argv[2] === 'string' ? fs.readFileSync(process.argv[2], 'utf8') : '';
console.log(content);
