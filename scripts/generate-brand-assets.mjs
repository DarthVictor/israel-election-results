import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crc32 = (value) => {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
};

const writePng = (filename, width, height, pixels) => {
  const rows = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    rows[rowStart] = 0;
    pixels.copy(rows, rowStart + 1, y * width * 3, (y + 1) * width * 3);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  writeFileSync(
    filename,
    Buffer.concat([
      pngSignature,
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(rows, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
};

const canvas = (width, height, color) => {
  const pixels = Buffer.alloc(width * height * 3);
  const set = (x, y, fill) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = (y * width + x) * 3;
    pixels[index] = fill[0];
    pixels[index + 1] = fill[1];
    pixels[index + 2] = fill[2];
  };
  const rect = (x, y, rectWidth, rectHeight, fill) => {
    for (let row = Math.max(0, y); row < Math.min(height, y + rectHeight); row += 1) {
      for (let column = Math.max(0, x); column < Math.min(width, x + rectWidth); column += 1)
        set(column, row, fill);
    }
  };
  const circle = (centerX, centerY, radius, fill) => {
    const radiusSquared = radius * radius;
    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radiusSquared) set(x, y, fill);
      }
    }
  };
  rect(0, 0, width, height, color);
  return { pixels, rect, circle };
};

const glyphs = {
  " ": ["000", "000", "000", "000", "000", "000", "000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "11110", "10000", "10000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
};

const text = (surface, value, x, y, scale, fill) => {
  let cursor = x;
  for (const character of value) {
    const glyph = glyphs[character] ?? glyphs[" "];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] === "1")
          surface.rect(cursor + column * scale, y + row * scale, scale, scale, fill);
      }
    }
    cursor += (glyph[0].length + 1) * scale;
  }
};

const cream = [245, 241, 232];
const green = [25, 63, 50];
const sage = [95, 135, 112];
const paleGreen = [220, 232, 223];
const orange = [220, 139, 53];

const social = canvas(1200, 630, cream);
social.rect(0, 0, 735, 630, green);
social.rect(78, 94, 82, 8, orange);
social.circle(1010, 168, 142, paleGreen);
social.circle(1010, 168, 94, sage);
social.circle(1010, 168, 43, orange);
social.circle(908, 415, 178, paleGreen);
social.circle(1054, 456, 118, sage);
social.rect(78, 482, 540, 2, sage);
text(social, "ISRAEL", 78, 144, 19, cream);
text(social, "ELECTION", 78, 265, 19, cream);
text(social, "RESULTS", 78, 386, 19, cream);
text(social, "EXPLORER", 78, 514, 7, cream);
text(social, "2019-2022", 78, 566, 7, orange);
writePng(resolve("public/social-preview.png"), 1200, 630, social.pixels);

const apple = canvas(180, 180, green);
apple.circle(90, 90, 76, paleGreen);
apple.circle(90, 90, 64, green);
for (let row = 0; row < 68; row += 1) {
  const inset = Math.floor(Math.abs(row - 34) * 0.78);
  apple.rect(51 + inset, 42 + row, 78 - inset * 2, 1, cream);
}
apple.circle(90, 131, 12, orange);
writePng(resolve("public/apple-touch-icon.png"), 180, 180, apple.pixels);

console.log("Generated public/social-preview.png and public/apple-touch-icon.png.");
