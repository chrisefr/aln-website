// One-off investigation: for every string field across every record in both
// layers, flag values that contain a comma but zero regular spaces - the
// signature of the "spaces got replaced by commas somewhere upstream" bug
// seen on a couple of fields. Used to check how widespread/consistent this
// is before deciding whether it's safe to auto-correct.
const config = require('../config');

async function fetchAll(featureServerUrl, outFields) {
  const records = [];
  let offset = 0;
  const pageSize = 500;
  for (;;) {
    const url =
      `${featureServerUrl}/0/query?where=1=1&outFields=${outFields}` +
      `&resultOffset=${offset}&resultRecordCount=${pageSize}&f=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    const features = data.features || [];
    records.push(...features.map((f) => f.attributes));
    if (features.length < pageSize) break;
    offset += pageSize;
  }
  return records;
}

function looksSuspicious(value) {
  if (typeof value !== 'string') return false;
  if (value.length < 8) return false; // too short to be meaningfully diagnostic
  const hasComma = value.includes(',');
  const hasSpace = value.includes(' ');
  return hasComma && !hasSpace;
}

async function scan(layerKey) {
  const url = config.featureServers[layerKey];
  console.log(`\n#### ${layerKey} ####`);
  const records = await fetchAll(url, '*');
  console.log(`fetched ${records.length} records`);

  const byField = new Map();
  for (const attrs of records) {
    for (const [field, value] of Object.entries(attrs)) {
      if (looksSuspicious(value)) {
        if (!byField.has(field)) byField.set(field, []);
        byField.get(field).push({ objectid: attrs.objectid, value });
      }
    }
  }

  for (const [field, hits] of byField) {
    console.log(`\n-- ${field}: ${hits.length} suspicious value(s) --`);
    for (const h of hits.slice(0, 3)) {
      console.log(`  objectid ${h.objectid}: ${h.value}`);
    }
  }
  if (byField.size === 0) console.log('(none found)');
}

async function main() {
  await scan('individuals');
  await scan('projects');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
