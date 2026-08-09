/* Pick a generated size for an /assets/… path.

   Originals are only worth their weight where someone looks closely: the
   project hero, the lightbox, the floor-plan sheets. Everywhere else — grids,
   inline figures, the drifting masthead wall — takes a resized WebP.
   Run `npm run thumbs` after adding any image to /public/assets. */

/* Only rewrites local /assets/ paths, because only those have generated
   sizes beside them. Images uploaded through the console live in Supabase
   Storage on another host — thumbs.mjs never sees them, so rewriting the
   extension there just asks for a .webp that was never made and 404s. Those
   are shrunk in the browser at upload time instead. */
const sized = (src, dir) =>
  String(src || "").startsWith("/assets/")
    ? src.replace("/assets/", `/assets/${dir}/`).replace(/\.(png|jpe?g)$/i, ".webp")
    : src;

/** 420px — masthead wall tiles. */
export const thumb = (src) => sized(src, "thumbs");

/** 900px — project cards and inline figures. */
export const card = (src) => sized(src, "cards");

/** 1800px — media that goes edge to edge. */
export const hero = (src) => sized(src, "hero");
