/* Content lives in src/content/*.json so the CMS can write it back; this module
   is only the typed doorway the pages import from.

   Nothing here should hold copy or data — add a field in the JSON and in
   admin/config.yml, not in this file.

   Notes that travel with the data:
   - `coords` are the pinned points read out of the client's own Google Maps
     links. A project without them is left off the map, never guessed.
   - `plans` are brochure floor sheets: whole-floor drawings with their area
     tables printed on them, which is why carpet areas are not retyped.
   - MahaRERA values read exactly as supplied. "To confirm" and "—" are real
     states, not placeholders to invent numbers for. */

import projects from "../content/projects.json";
import testimonials from "../content/testimonials.json";
import eras from "../content/eras.json";
import site from "../content/site.json";

export const PROJECTS = projects;
export const TESTIMONIALS = testimonials;
export const ERAS = eras;

export const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug);

export const PHONE = site.phone;
export const PHONE_DISPLAY = site.phoneDisplay;
export const WHATSAPP = site.whatsapp;
export const LEGAL = site.legal;
