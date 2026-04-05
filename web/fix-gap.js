const fs = require('fs');
let svg = fs.readFileSync('public/depmi-wordmark.svg', 'utf8');
svg = svg.replace('<rect x="350" y="319.5" width="250" height="100" fill="black"/> ', '<rect x="350" y="321" width="250" height="100" fill="black"/> ');
fs.writeFileSync('public/depmi-wordmark.svg', svg);
