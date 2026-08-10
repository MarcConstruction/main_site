/* Suggest nearby landmarks from a project's map pin.

   OpenStreetMap's Overpass API: free, no key, no billing account, and it
   allows browser requests. Google Places would need a key on a card and this
   runs a handful of times a year.

   What it returns is a STARTING POINT, not an answer. Two reasons it must be
   reviewed before publishing:

     - distances are straight-line, not the road a buyer drives. A landmark
       600 m across a river is not 600 m away.
     - OSM coverage in Ahilyanagar is contributed, not surveyed. Names are
       sometimes missing, sometimes stale.

   A builder quoting distances is making a claim buyers rely on, so the
   console fills the rows in and a human corrects them. */

const CATEGORIES = [
  { label: "Nearest bus stop", radius: 6000, q: 'node["highway"="bus_stop"]' },
  { label: "School", radius: 6000, q: 'nwr["amenity"="school"]' },
  { label: "Hospital", radius: 8000, q: 'nwr["amenity"="hospital"]' },
  { label: "Railway station", radius: 15000, q: 'nwr["railway"="station"]' },
  { label: "Market", radius: 8000, q: 'nwr["amenity"="marketplace"]' },
  { label: "Bank", radius: 5000, q: 'nwr["amenity"="bank"]' }
];

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

const metresBetween = (aLat, aLng, bLat, bLng) => {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/* Rounded, because a straight-line measurement does not deserve three
   significant figures. "1.1 KM" reads as a claim; "1,143 m" reads as a lie
   with a decimal point. */
const format = (m) =>
  m < 1000 ? `${Math.max(50, Math.round(m / 50) * 50)} M` : `${(m / 1000).toFixed(1)} KM`;

export async function suggestNearby(coords) {
  const [lat, lng] = String(coords || "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Add the map coordinates first — suggestions are measured from the pin.");
  }

  const body = `[out:json][timeout:25];(${CATEGORIES.map(
    (c) => `${c.q}(around:${c.radius},${lat},${lng});`
  ).join("")});out center tags;`;

  /* Form-encoded, not a raw body — Overpass answers 406 to the latter.
     No User-Agent header: browsers forbid setting it, and set their own. */
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(body)
  });
  if (!res.ok) throw new Error(`OpenStreetMap returned ${res.status}. Try again in a moment.`);

  const { elements = [] } = await res.json();

  const named = elements
    .map((e) => ({
      name: e.tags?.name?.trim(),
      tags: e.tags || {},
      lat: e.lat ?? e.center?.lat,
      lng: e.lon ?? e.center?.lon
    }))
    .filter((e) => e.name && Number.isFinite(e.lat) && Number.isFinite(e.lng))
    .map((e) => ({ ...e, m: metresBetween(lat, lng, e.lat, e.lng) }));

  const matches = (e, c) =>
    c.label === "Nearest bus stop" ? e.tags.highway === "bus_stop"
      : c.label === "School" ? e.tags.amenity === "school"
      : c.label === "Hospital" ? e.tags.amenity === "hospital"
      : c.label === "Railway station" ? e.tags.railway === "station"
      : c.label === "Market" ? e.tags.amenity === "marketplace"
      : e.tags.amenity === "bank";

  /* One of each, nearest first — six of the same chain of banks is not a
     description of a neighbourhood. */
  return CATEGORIES.map((c) => {
    const best = named.filter((e) => matches(e, c)).sort((a, b) => a.m - b.m)[0];
    return best ? { place: best.name, distance: format(best.m) } : null;
  }).filter(Boolean);
}
