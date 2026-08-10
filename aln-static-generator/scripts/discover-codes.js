// One-off discovery script (not part of the build pipeline): pages through
// every Projects record and prints every distinct comma-split token seen in
// the two fields that have no domain metadata, so we can hand-write an
// accurate lookup table instead of guessing from one sample record.
const config = require('../config');

async function fetchAllValues(featureServerUrl, fieldName) {
  const values = new Set();
  let offset = 0;
  const pageSize = 500;
  for (;;) {
    const url =
      `${featureServerUrl}/0/query?where=1=1&outFields=${fieldName}` +
      `&resultOffset=${offset}&resultRecordCount=${pageSize}&f=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    const features = data.features || [];
    for (const f of features) {
      const raw = f.attributes[fieldName];
      if (!raw) continue;
      for (const part of String(raw).split(',')) {
        const trimmed = part.trim();
        if (trimmed) values.add(trimmed);
      }
    }
    if (features.length < pageSize) break;
    offset += pageSize;
  }
  return values;
}

async function main() {
  const url = config.featureServers.projects;
  for (const field of ['support_of_alc_principles', 'support_of_sustainable_developm']) {
    const values = await fetchAllValues(url, field);
    console.log(`\n=== ${field} (${values.size} distinct values) ===`);
    for (const v of [...values].sort()) console.log(v);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
