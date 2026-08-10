// One-off: pulls the Survey123 XForm-derived webform HTML for "ALN - FORM 2
// (PROJECTS)" and extracts value->label pairs for the two checkbox fields
// whose feature-layer domain metadata is null (support_of_alc_principles,
// support_of_sustainable_developm), so we can hand-write an accurate lookup
// table instead of guessing at truncated codes.
async function main() {
  const formItemId = process.argv[2];
  const fieldNames = process.argv.slice(3);
  if (!formItemId || fieldNames.length === 0) {
    console.error('Usage: node extract-choices.js <formItemId> <fieldName> [fieldName...]');
    process.exitCode = 1;
    return;
  }

  const res = await fetch(
    `https://ifla-aln.maps.arcgis.com/sharing/rest/content/items/${formItemId}/info/form.webform?f=json`
  );
  const data = await res.json();
  const html = data.form || '';

  for (const fieldName of fieldNames) {
    console.log(`\n=== ${fieldName} ===`);
    // Match each checkbox input for this field name, then the option-label
    // span that immediately follows it.
    // The option-label span's `id="..."` attribute is present in some forms
    // and absent in others - keep it optional rather than assuming either way.
    const inputRe = new RegExp(
      `name="[^"]*${fieldName}"[^>]*value="([^"]+)"[\\s\\S]*?option-label active"(?: id="[^"]*")?>([^<]+)<`,
      'g'
    );
    const unescapeHtml = (s) =>
      s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
    let m;
    let count = 0;
    while ((m = inputRe.exec(html))) {
      console.log(`${unescapeHtml(m[1])}  =>  ${unescapeHtml(m[2])}`);
      count++;
    }
    console.log(`(${count} choices found)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
