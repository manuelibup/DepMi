const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('public/depmi.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    let e_contour = [];
    for (let y = 275; y <= 364; y++) {
      let minX = -1, maxX = -1;
      for (let x = 180; x <= 280; x++) {
        const idx = (this.width * y + x) << 2;
        if (this.data[idx+3] > 128 && this.data[idx] > 150) {
          if (minX === -1) minX = x;
          maxX = x;
        }
      }
      if (minX !== -1) {
        e_contour.push(`y=${y}: x=[${minX}, ${maxX}]`);
      }
    }
    console.log(e_contour.join('\n'));
  });
