/* Social icons, drawn rather than downloaded.

   Six glyphs at this size are not worth a sprite sheet, a font, or a
   dependency: inline SVG inherits currentColor, so the footer's own colour
   applies without a second set of assets for the dark ground.

   `find` matches on the URL, so the console only ever asks for a link and the
   right mark follows. An unrecognised host still renders — with a globe —
   rather than being silently dropped. */

export const NETWORKS = [
  { key: "instagram", label: "Instagram", match: /instagram\.com/i },
  { key: "facebook", label: "Facebook", match: /facebook\.com|fb\.com/i },
  { key: "youtube", label: "YouTube", match: /youtube\.com|youtu\.be/i },
  { key: "linkedin", label: "LinkedIn", match: /linkedin\.com/i },
  { key: "x", label: "X", match: /twitter\.com|x\.com/i },
  { key: "whatsapp", label: "WhatsApp", match: /wa\.me|whatsapp\.com/i }
];

export const networkFor = (url) =>
  NETWORKS.find((n) => n.match.test(String(url || "")))?.key ?? "link";

const P = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: <path d="M14.5 8.5h2.2V5.6h-2.4c-2.2 0-3.6 1.4-3.6 3.7v1.9H8.4v2.9h2.3V21h3v-6.9h2.3l.4-2.9h-2.7V9.6c0-.7.3-1.1.8-1.1z" />,
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.3 9.6 15 12l-4.7 2.4z" fill="currentColor" stroke="none" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M7.6 10.4V17M7.6 7.4v.1M11.4 17v-3.7c0-1.4.9-2.3 2.1-2.3s2.1.9 2.1 2.3V17" />
    </>
  ),
  x: <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" />,
  whatsapp: (
    <>
      <path d="M20.5 11.7a8.4 8.4 0 0 1-12.5 7.3L3.5 20.5l1.6-4.6A8.4 8.4 0 1 1 20.5 11.7z" />
      <path d="M9.2 8.6c-.3.7-.2 1.6.4 2.5a7 7 0 0 0 3.3 2.7c.9.3 1.7.2 2.2-.3" />
    </>
  ),
  link: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5z" />
    </>
  )
};

export function SocialIcon({ url, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[networkFor(url)]}
    </svg>
  );
}
