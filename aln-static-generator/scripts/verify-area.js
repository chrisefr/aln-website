const config = require('../config');
const { polygonAreaHectares } = require('../lib/geo');

async function main() {
  const url =
    config.featureServers.projects +
    "/0/query?where=" +
    encodeURIComponent("project_name='Freedom Park'") +
    "&outFields=objectid,project_name&resultRecordCount=5&f=json";
  const res = await fetch(url);
  const data = await res.json();
  for (const f of data.features) {
    const ha = polygonAreaHectares(f.geometry);
    console.log(f.attributes.objectid, f.attributes.project_name, '->', Math.round(ha), 'Ha');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
