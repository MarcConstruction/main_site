/* Pick a generated size for an /assets/… path.

   Originals are only worth their weight where someone looks closely: the
   project hero, the lightbox, the floor-plan sheets. Everywhere else — grids,
   inline figures, the drifting masthead wall — takes a resized WebP.
   Run `npm run thumbs` after adding any image to /public/assets. */

const sized = (src, dir) =>
  src.replace("/assets/", `/assets/${dir}/`).replace(/\.(png|jpe?g)$/i, ".webp");

/** 420px — masthead wall tiles. */
export const thumb = (src) => sized(src, "thumbs");

/** 900px — project cards and inline figures. */
export const card = (src) => sized(src, "cards");

/** 1800px — media that goes edge to edge. */
export const hero = (src) => sized(src, "hero");
