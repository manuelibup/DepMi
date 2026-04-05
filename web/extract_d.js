const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('public/depmi.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    let d_contour = [];
    for (let y = 280; y <= 360; y++) {
      let minX = -1, maxX = -1;
      let holeMinX = -1, holeMaxX = -1;
      let stroke1 = false, hole = false, stroke2 = false;
      
      for (let x = 80; x <= 180; x++) {
        const idx = (this.width * y + x) << 2;
        const solid = this.data[idx+3] > 128 && this.data[idx] > 150;
        
        if (solid && !stroke1 && !hole) {
           stroke1 = true;
           minX = x;
        } else if (!solid && stroke1 && !hole) {
           hole = true;
           holeMinX = x;
        } else if (solid && hole && !stroke2) {
           stroke2 = true;
           holeMaxX = x - 1;
           maxX = x;
        } else if (solid && stroke2) {
           maxX = x;
        }
      }
      
      d_contour.push(`y=${y}: Hole=[${holeMinX}, ${holeMaxX}] (width ${holeMaxX - holeMinX + 1}), RightStroke=[${holeMaxX+1}, ${maxX}]`);
    }
    console.log(d_contour.join('\n'));
  });
