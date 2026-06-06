const fs = require('fs');
const path = require('path');

function getJpgSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    return null; // Not a JPG
  }
  let offset = 2;
  while (offset < buffer.length) {
    const marker = buffer.readUInt16BE(offset);
    offset += 2;
    if (marker === 0xFFD9 || marker === 0xFFDA) {
      break; // End of image or Start of scan
    }
    const length = buffer.readUInt16BE(offset);
    if (marker >= 0xFFC0 && marker <= 0xFFC3) {
      // SOF0, SOF1, SOF2, SOF3
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return { width, height };
    }
    offset += length;
  }
  return null;
}

const dir = 'frontend/public/team';
fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).forEach(f => {
  const p = path.join(dir, f);
  const size = getJpgSize(p);
  if (size) {
    console.log(`${f}: ${size.width}x${size.height} (ratio: ${(size.width/size.height).toFixed(2)})`);
  } else {
    console.log(`${f}: Could not read size`);
  }
});
