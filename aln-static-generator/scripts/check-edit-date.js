const config = require('../config');

async function main() {
  const url =
    config.featureServers.projects +
    "/0/query?where=" +
    encodeURIComponent("project_name='Freedom Park'") +
    "&outFields=objectid,project_name,EditDate,CreationDate&resultRecordCount=5&f=json";
  const res = await fetch(url);
  const data = await res.json();
  for (const f of data.features) {
    console.log(
      f.attributes.objectid,
      f.attributes.project_name,
      'created', new Date(f.attributes.CreationDate).toISOString(),
      'edited', new Date(f.attributes.EditDate).toISOString()
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
