const fs = require('fs');
const lines = fs.readFileSync('models.txt', 'utf8').split('\n');
lines.filter(l => l.includes('flash')).forEach(l => console.log(l.trim()));
