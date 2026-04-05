const fs = require('fs');
const { PNG } = require('pngjs');

const path = 'public/depmi.png';

fs.createReadStream(path)
  .pipe(new PNG())
  .on('parsed', function () {
    console.log(`Image size: ${this.width} x ${this.height}`);

    const data = this.data;
    const isSolid = (x, y) => {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
      const idx = (this.width * y + x) << 2;
      return data[idx] > 128 || data[idx + 3] > 128; // Assuming orange on transparent, or white on orange
    };
    
    // Find left bound
    let minX = this.width, maxX = 0, minY = this.height, maxY = 0;
    
    // thresholding - the text is supposed to be #FF5C38.
    // Let's just analyze by checking if pixel is not fully transparent.
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const alpha = data[idx + 3];
        // If image has white background, check RGB difference
        // If transparent PNG, check alpha
        let solid = false;
        if (alpha > 128) { // Likely transparent PNG
            // is it orange? #FF5C38 is 255, 92, 56
            if (data[idx] > 150) solid = true;
        } else if (alpha === 255) { // Maybe solid background
            // Check if it's white vs orange
            if (data[idx] < 240 || data[idx+1] < 240 || data[idx+2] < 240) solid = true;
        }
        
        if (solid) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    
    console.log(`Global bounds: x=[${minX}, ${maxX}] y=[${minY}, ${maxY}]`);
    
    // Let's do horizontal projection to find letters roughly
    let colCounts = new Array(this.width).fill(0);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const idx = (this.width * y + x) << 2;
        if (data[idx+3] > 128 && data[idx] > 150) {
          colCounts[x]++;
        }
      }
    }
    
    let currentObject = null;
    let objects = [];
    for (let x = minX; x <= maxX; x++) {
       if (colCounts[x] > 0) {
           if (!currentObject) currentObject = {start: x, end: x};
           else currentObject.end = x;
       } else {
           if (currentObject) {
               objects.push(currentObject);
               currentObject = null;
           }
       }
    }
    if (currentObject) objects.push(currentObject);
    
    console.log('Horizontal objects (X spans):');
    objects.forEach((obj, i) => {
        let max_y = 0;
        let min_y = this.height;
        for (let x = obj.start; x <= obj.end; x++) {
            for (let y = minY; y <= maxY; y++) {
                const idx = (this.width * y + x) << 2;
                if (data[idx+3] > 128 && data[idx] > 150) {
                    if (y < min_y) min_y = y;
                    if (y > max_y) max_y = y;
                }
            }
        }
        console.log(`Object ${i}: x=[${obj.start}, ${obj.end}] (width: ${obj.end - obj.start + 1}), y=[${min_y}, ${max_y}] (height: ${max_y - min_y + 1})`);
    });

  });
