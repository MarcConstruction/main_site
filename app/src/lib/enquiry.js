/* Sending an enquiry, from the contact page and from the brochure dialog.

   One function so the two cannot drift: the same columns, the same honeypot
   rule, the same failure behaviour. The only difference between them is
   `source`, which is what lets the console tell a brochure download from
   someone writing in. */

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function sendEnquiry({ name, phone, project, message, source = "contact" }) {
  const res = await fetch(`${SB_URL}/rest/v1/enquiries`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      name: name || null,
      phone,
      project: project || null,
      message: message || null,
      source
    })
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

/* Start the download without navigating away, so the success state stays on
   screen and the visitor keeps their place on the page. `download` only
   applies same-origin — the file is on Supabase Storage, so the browser
   opens its own PDF viewer in a new tab instead. Either way they get it. */
export function fetchBrochure(url, filename = "brochure.pdf") {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
