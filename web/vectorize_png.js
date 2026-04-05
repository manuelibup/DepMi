const fs = require('fs');
const potrace = require('potrace');

const imagePath = 'public/depmi.png';

potrace.trace(imagePath, function(err, svg) {
  if (err) {
    console.error("Error tracing image:", err);
    return;
  }
  
  fs.writeFileSync('output_traced.svg', svg);
  console.log("SVG written to output_traced.svg");
});
