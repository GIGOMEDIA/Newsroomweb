const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const SOURCE = path.join(
  __dirname,
  "..",
  "..",
  "src",
  "assets",
  "images",
  "logo.png",
);
const DEST = path.join(__dirname, "..", "..", "build", "icon.png");
const TARGET_SIZE = 1024;
const BG = { r: 7, g: 9, b: 11 };
const HORIZONTAL_INSET = 0.06;

const data = fs.readFileSync(SOURCE);
const src = PNG.sync.read(data);

const drawWidth = Math.round(TARGET_SIZE * (1 - HORIZONTAL_INSET * 2));
const drawHeight = Math.round((drawWidth / src.width) * src.height);
const offsetX = Math.round((TARGET_SIZE - drawWidth) / 2);
const offsetY = Math.round((TARGET_SIZE - drawHeight) / 2);

const dst = new PNG({ width: TARGET_SIZE, height: TARGET_SIZE });

for (let y = 0; y < TARGET_SIZE; y++) {
  for (let x = 0; x < TARGET_SIZE; x++) {
    const dstIdx = (y * TARGET_SIZE + x) * 4;
    dst.data[dstIdx] = BG.r;
    dst.data[dstIdx + 1] = BG.g;
    dst.data[dstIdx + 2] = BG.b;
    dst.data[dstIdx + 3] = 255;

    const localX = x - offsetX;
    const localY = y - offsetY;
    if (
      localX < 0 ||
      localX >= drawWidth ||
      localY < 0 ||
      localY >= drawHeight
    ) {
      continue;
    }

    const sx = Math.floor((localX / drawWidth) * src.width);
    const sy = Math.floor((localY / drawHeight) * src.height);
    const srcIdx = (sy * src.width + sx) * 4;
    const sr = src.data[srcIdx];
    const sg = src.data[srcIdx + 1];
    const sb = src.data[srcIdx + 2];
    const sa = src.data[srcIdx + 3];

    if (sa === 0) continue;

    const alpha = sa / 255;
    dst.data[dstIdx] = Math.round(sr * alpha + BG.r * (1 - alpha));
    dst.data[dstIdx + 1] = Math.round(sg * alpha + BG.g * (1 - alpha));
    dst.data[dstIdx + 2] = Math.round(sb * alpha + BG.b * (1 - alpha));
    dst.data[dstIdx + 3] = 255;
  }
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, PNG.sync.write(dst));
console.log(
  `Wrote ${DEST} (${TARGET_SIZE}x${TARGET_SIZE}, logo ${drawWidth}x${drawHeight} centered)`,
);
