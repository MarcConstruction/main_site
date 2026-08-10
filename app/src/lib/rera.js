/* How a MahaRERA number reads when there isn't one yet.

   The value arrives as a real registration, or as one of the several ways
   "not yet" has been recorded over the years: an empty field, "To confirm",
   an em dash. They all mean the same thing to a buyer, so they say the same
   thing on the page.

   This only ever replaces a missing value with a phrase. A number that
   exists is passed through untouched — never reformatted, never invented.
   That rule is the whole reason these states exist in the data. */

export const PENDING_LABEL = "Updating soon";

const NOT_YET = new Set(["", "-", "—", "–", "to confirm", "tbc", "pending", "updating soon"]);

export const isPending = (value) =>
  NOT_YET.has(String(value ?? "").trim().toLowerCase());

export const reraLabel = (value) =>
  isPending(value) ? PENDING_LABEL : String(value).trim();
