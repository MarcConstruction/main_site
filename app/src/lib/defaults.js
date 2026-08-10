/* Marc's standard specification and amenity list, taken from Trident.

   One copy, imported by both the console (the "Fill with Marc's standard
   specifications" button, and the amenity chips offered on every project) and
   the project page (what a project with none of its own falls back to).

   They were two separate lists before, which meant the template an editor
   started from and the text the website showed when they wrote nothing could
   quietly disagree. */

export const DEFAULT_SPECS = [
  { k: "STRUCTURE", v: "RCC framed structure" },
  { k: "FLOORING", v: "Vitrified tiles; anti-skid in wet areas" },
  { k: "KITCHEN", v: "Granite platform, stainless sink, dado tile up to lintel level" },
  { k: "DOORS", v: "Flush doors for bedroom and main door with plywood box frame" },
  { k: "WINDOWS", v: "UPVC window with mosquito net" },
  { k: "ELECTRICAL", v: "Concealed electrification with ample points" },
  { k: "WATER", v: "Underground + overhead tanks, Municipal Corporation water provision" },
  { k: "PLUMBING", v: "Concealed plumbing with sanitary ware & CP fittings of standard make" }
];

/* Offered on every project, not a closed set — anything typed into the
   console is kept and appears alongside these next time. */
export const DEFAULT_AMENITIES = [
  "Lifts with battery backup",
  "Multipurpose hall on terrace",
  "Indoor games & home theatre system on terrace",
  "Landscape garden on terrace",
  "Solar water heater",
  "Solar PV panels",
  "CCTV campus"
];
