// Generates the responsive WebP variants (<name>-<width>.webp) that the storefront
// and product pages request via srcset. Run `npm run images` after adding or
// replacing a product JPEG in public/images. Widths must match src/images.ts.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = "public/images";
const WIDTHS = [480, 720, 1200];
// Not product photography: the share image and the unused source logo.
const SKIP = new Set(["logo-og.jpg", "sujood_brand_logo_1783118318769.jpg"]);

const jpgs = fs.readdirSync(DIR).filter((f) => f.endsWith(".jpg") && !SKIP.has(f));

for (const file of jpgs) {
  const src = path.join(DIR, file);
  const base = file.replace(/\.jpg$/, "");
  for (const width of WIDTHS) {
    const out = path.join(DIR, `${base}-${width}.webp`);
    await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 74 }).toFile(out);
    console.log(`${out}  ${Math.round(fs.statSync(out).size / 1024)} KB`);
  }
}
