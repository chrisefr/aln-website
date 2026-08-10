// Constants confirmed by hand against the live ArcGIS org (ifla-aln.maps.arcgis.com)
// on 2026-08-10. See the "aln-site-rebuild" memory for how each of these was found.
const path = require('path');

module.exports = {
  // Base origin the sitemap's absolute URLs are built from. Confirmed by
  // the user 2026-08-10: production is the Netlify subdomain, no custom
  // domain yet - update this if/when one gets configured, then rebuild.
  siteUrl: 'https://aln-website.netlify.app',

  // Where generated pages/images/sitemap.xml land: directly in the repo
  // root (sibling of index.html, css/, images/), since that's the site
  // Netlify actually publishes. The generator's job is to populate real
  // site content, not a separate output/ tree. Not committed to git (see
  // .gitignore) - regenerated fresh on every build.
  siteOutputDir: path.join(__dirname, '..'),

  featureServers: {
    individuals:
      'https://services3.arcgis.com/oX4jyIa5fwBy50r9/arcgis/rest/services/survey123_e36f854f63354167890a5a8b14c3a3ec/FeatureServer',
    projects:
      'https://services3.arcgis.com/oX4jyIa5fwBy50r9/arcgis/rest/services/survey123_ca089f9bad964482a7fc0b9afe4b6a27/FeatureServer',
  },

  // Each Instant App registers its layers under its own app-specific layerId.
  // "View on map" links are built as:
  //   {mapBase}?appid={appid}&layerId={layerId}&oid={objectid}
  mapBase: 'https://ifla-aln.maps.arcgis.com/apps/instant/attachmentviewer/index.html',
  mapLinks: {
    individuals: {
      appid: '8f15771ddec4489bb617ff34c8d2d4a8',
      layerId: 'survey123_e36f854f63354167890a5a8b14c3a3ec_5297',
    },
    projects: {
      appid: 'a4f122053f98481e88d0d8c218b2148e',
      layerId: '1933e84c2e0-layer-11',
    },
  },

  // System/consent metadata fields present on every Survey123 layer.
  // Never meaningful to a public visitor, so always dropped before rendering.
  systemFields: [
    'objectid',
    'globalid',
    'CreationDate',
    'Creator',
    'EditDate',
    'Editor',
    '_permission',
    'responsibility',
    '_date',
    'protection_of_personal_informat',
    'Shape__Area',
    'Shape__Length',
  ],

  // Fields with real personal data that the REST API happily returns today
  // but should never land on a public, search-indexed page. Revisit deliberately
  // if ALN ever wants any of these shown.
  sensitiveFields: {
    individuals: ['e_mail', 'professional_number'],
    projects: [],
  },

  // Choice lists that have domain: null in the feature layer schema (a known
  // Survey123 quirk where some multi-select choice lists don't publish as
  // real coded-value domains). Pulled 2026-08-10 straight from the source
  // XForm's own question definitions (`.../info/form.webform`), so this is
  // ALN's actual wording, not a guess reconstructed from truncated codes.
  codeLookups: {
    support_of_alc_principles: {
      Celebrate_and_affirm_the_value_:
        'Celebrate and affirm the value of unity in diversity, recognise and honour the principles of community self-management, equality and cooperation often embodied in the founding documents or fundamental statements about the birth and development of nations of this continent',
      Acknowledge_the_responsibility_:
        'Acknowledge the responsibility we all have to nurture the continued health and diversity of landscapes, to ensure the sustainable integration of protection, production, preservation, and habitation for all living things',
      Understand_that_landscape_shape:
        'Understand that landscape shapes culture and identity at both a local and regional scale',
      Respect_the_extent_to_which_peo:
        "Respect the extent to which people are grounded in place by tradition, forebears, or identification with 'home'",
      Foster_places_to_inspire_enrich:
        'Foster places to inspire, enrich, or reveal natural and cultural elements of landscape, creating regenerative settings in which people can flourish',
      Encourage_communities_to_active:
        'Encourage communities to actively participate in the sustainable planning, design and management of their landscapes, through the articulation of values associated with their beliefs and their national, regional and local places',
      Recognise_the_importance_of_goo:
        'Recognise the importance of good quality sustainable landscape planning, design and management to ensure the ecological health, economic viability, social vitality and cultural expression of communities',
      Create_well_designed_economical:
        'Create well-designed, economically sound and resilient landscapes that sustain, enhance and revitalise physical, emotional, spiritual and cultural wellbeing',
    },
    support_of_sustainable_developm: {
      'GOAL_1:_No_Poverty_': 'GOAL 1: No Poverty',
      'GOAL_2:_Zero_Hunger': 'GOAL 2: Zero Hunger',
      'GOAL_3:_Good_Health_and_Well_be': 'GOAL 3: Good Health and Well-being',
      'GOAL_4:_Quality_Education': 'GOAL 4: Quality Education',
      'GOAL_5:_Gender_Equality': 'GOAL 5: Gender Equality',
      'GOAL_6:_Clean_Water_and_Sanitat': 'GOAL 6: Clean Water and Sanitation',
      'GOAL_7:_Affordable_and_Clean_En': 'GOAL 7: Affordable and Clean Energy',
      'GOAL_8:_Decent_Work_and_Economi': 'GOAL 8: Decent Work and Economic Growth',
      'GOAL_9:_Industry_Innovation_and': 'GOAL 9: Industry, Innovation and Infrastructure',
      'GOAL_10:_Reduced_Inequality': 'GOAL 10: Reduced Inequality',
      'GOAL_11:_Sustainable_Cities_and': 'GOAL 11: Sustainable Cities and Communities',
      'GOAL_12:_Responsible_Consumptio': 'GOAL 12: Responsible Consumption and Production',
      'GOAL_13:_Climate_Action_': 'GOAL 13: Climate Action',
      'GOAL_14:_Life_Below_Water_': 'GOAL 14: Life Below Water',
      'GOAL_15:_Life_on_Land_': 'GOAL 15: Life on Land',
      'GOAL_16:_Peace_and_Justice_Stro': 'GOAL 16: Peace and Justice Strong Institutions',
      'GOAL_17:_Partnerships_to_achiev': 'GOAL 17: Partnerships to achieve the Goal',
    },
    landscape_application: {
      aeronautical: 'aeronautical',
      agricultural: 'agricultural',
      archaeological: 'archaeological',
      cemeteries: 'cemeteries',
      cinematic: 'cinematic',
      coastal: 'coastal',
      commercial: 'commercial',
      correctional: 'correctional',
      educational: 'educational',
      energy: 'energy',
      fishing: 'fishing',
      historical: 'historical',
      horticultural: 'horticultural',
      industrial: 'industrial',
      infrastructural: 'infrastructural',
      landscape_and_urban_design: 'urban design/ regeneration',
      marine: 'marine',
      military: 'military',
      'mining_&_quarrying': 'mining & quarrying',
      'monuments_&_memorials': 'monuments & memorials',
      mythical: 'mythical',
      'parks_&_recreational': 'parks & recreational',
      'ports_&_harbours': 'ports & harbours',
      residential: 'residential',
      retail: 'office & retail',
      rehabilitation_restoration: 'rehabilitation/ restoration',
      sacred: 'sacred',
      sports: 'sports',
      sylvicultural: 'sylvicultural',
      tourism: 'tourism',
      traditional: 'traditional',
      transport: 'transport',
      wilderness: 'wilderness',
      waterway_s_: 'waterway(s)',
      other: 'other',
    },
    other_institutions: {
      IFLA_International_Federation_o: 'IFLA (International Federation of Landscape Architects)',
      ICOMOS_Internation_Council_on_M: 'ICOMOS (International Council on Monuments and Sites)',
      IUCN_International_Union_for_Co: 'IUCN (International Union for Conservation of Nature)',
      ICCROM_International_Centre_for:
        'ICCROM (International Centre for the Study of the Preservation and Restoration of Cultural Property)',
      other: 'Other',
    },
    other_areas_of_work: {
      academic: 'academic',
      private: 'private',
      government: 'government',
      NGO: 'NGO',
      voluntary: 'voluntary',
    },
    additional_fields_of_study: {
      anthropology: 'anthropology',
      engineering: 'engineering',
      administrator_of_heritage: 'administrator of heritage',
      geography: 'geography',
      archaeology: 'archaeology',
      history: 'history',
      architecture: 'architecture',
      landscape_architecture: 'landscape architecture',
      archivist: 'archivist',
      palaeontology: 'palaeontology',
      Art_history: 'art history',
      Town_Planning: 'town planning',
      Conservation: 'conservation',
      Urban_Design: 'urban design',
      Ecology: 'ecology',
      other: 'Other',
    },
    // countries_of_practice deliberately has no lookup here: its raw values
    // are already plain country names (e.g. "France"), not codes - the
    // general comma-spacing normalization in lib/transform.js is enough.
  },

  // Attachment "keywords" (Survey123's tag for which question an attachment
  // came from) allowed onto the public page. Everything else - e.g. the CV PDF
  // seen on the individuals layer (keyword "biography") - is fetched so we know
  // it exists, but not linked/rendered, by default.
  // "biography" (the CV) was originally excluded by default as a PII surface
  // - the user explicitly asked to include it on 2026-08-10, so it's allowed
  // through now. Revisit if that changes.
  publicAttachmentKeywords: {
    individuals: ['profile_image', 'biography'],
    projects: ['project_cover_images_and_graphi'],
  },
};
