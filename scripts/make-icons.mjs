// Generates PWA icons: white camera mark centered on ink background.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INK = { r: 4, g: 7, b: 7, alpha: 1 };
const SRC = path.join(__dirname, "..", "public", "brand", "logo-icon.png");
const OUT = path.join(__dirname, "..", "public");

async function make(size, name) {
  const mark = await sharp(SRC)
    .resize(Math.round(size * 0.62), Math.round(size * 0.62), {
      fit: "inside",
    })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: INK },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, name));
  console.log("wrote", name);
}

(async () => {
  await make(192, "icon-192.png");
  await make(512, "icon-512.png");
  await make(180, "apple-touch-icon.png");
})();
