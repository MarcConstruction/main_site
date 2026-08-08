/* Generate small WebP tiles for the masthead DriftWall.
   The wall paints 190×126 tiles; without this it would download the full
   renders (28 MB on the homepage) to draw them. Build-time only — sharp never
   ships to the browser.

     node scripts/thumbs.mjs
*/
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// fileURLToPath, not URL.pathname — the latter yields "/C:/..." on Windows.
const SRC = fileURLToPath(new URL("../public/assets/", import.meta.url));

// Two sizes, both at 2x for high-DPI: tiles for the drifting masthead wall,
// cards for the project grids and inline figures. Full-resolution originals
// stay for the detail hero, the lightbox and the floor-plan sheets, which are
// the only places anyone actually looks closely.
const SIZES = [
  { dir: "thumbs", width: 420, quality: 78 },
  { dir: "cards", width: 900, quality: 80 },
  // Full-bleed media (the scroll-expand band) spans the whole viewport, so the
  // 900px card upscales and goes soft. Still a fraction of the original PNG.
  { dir: "hero", width: 1800, quality: 76 }
];

const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f));
const mb = (n) => (n / 1048576).toFixed(2);
let before = 0;
for (const f of files) before += (await stat(join(SRC, f))).size;

for (const { dir, width, quality } of SIZES) {
  const out = join(SRC, dir);
  await mkdir(out, { recursive: true });
  let after = 0;
  for (const f of files) {
    const dest = join(out, `${parse(f).name}.webp`);
    await sharp(join(SRC, f))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(dest);
    after += (await stat(dest)).size;
  }
  console.log(
    `${dir.padEnd(7)} ${String(width).padStart(4)}px  ${files.length} images  ` +
    `${mb(before)} MB -> ${mb(after)} MB  (${Math.round((1 - after / before) * 100)}% smaller)`
  );
}
