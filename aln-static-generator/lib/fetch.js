// Thin wrappers over the ArcGIS FeatureServer REST API. Both layers are
// public with no auth token (confirmed 2026-08-10), so these are plain fetches.
const { fetchWithRetry: fetch } = require('./http');

async function fetchRecordByWhere(featureServerUrl, where) {
  const url =
    `${featureServerUrl}/0/query?where=${encodeURIComponent(where)}` +
    `&outFields=*&f=json&resultRecordCount=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Query failed (${res.status} ${res.statusText}) for ${url}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`ArcGIS error: ${JSON.stringify(data.error)}`);
  }
  return { fields: data.fields, feature: (data.features || [])[0] };
}

// Pages through every record in a layer. ArcGIS caps how many features a
// single query returns (we've seen exceededTransferLimit:true even on a
// 1-record request), so this keeps requesting resultOffset/resultRecordCount
// pages until a short page tells us we've reached the end.
async function fetchAllRecords(featureServerUrl, pageSize = 500) {
  const allFeatures = [];
  let fieldsMeta = null;
  let offset = 0;
  for (;;) {
    const url =
      `${featureServerUrl}/0/query?where=1=1&outFields=*` +
      `&resultOffset=${offset}&resultRecordCount=${pageSize}&f=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Query failed (${res.status} ${res.statusText}) for ${url}`);
    }
    const data = await res.json();
    if (data.error) {
      throw new Error(`ArcGIS error: ${JSON.stringify(data.error)}`);
    }
    if (!fieldsMeta) fieldsMeta = data.fields;
    const features = data.features || [];
    allFeatures.push(...features);
    if (features.length < pageSize) break;
    offset += pageSize;
  }
  return { fields: fieldsMeta, features: allFeatures };
}

async function fetchAttachments(featureServerUrl, objectid) {
  const url = `${featureServerUrl}/0/${objectid}/attachments?f=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Attachments fetch failed (${res.status} ${res.statusText}) for ${url}`);
  }
  const data = await res.json();
  return data.attachmentInfos || [];
}

module.exports = { fetchRecordByWhere, fetchAllRecords, fetchAttachments };
