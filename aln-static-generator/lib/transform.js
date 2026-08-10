// Turns a raw ArcGIS attribute set into display-ready rows, using the field
// metadata (alias, domain codedValues, type) that the query response already
// includes - no hand-maintained label map needed for most fields.

const { formatArea } = require('./geo');

function buildDomainMaps(fieldsMeta, extraCodeLookups) {
  const domainMaps = new Map();
  for (const f of fieldsMeta) {
    if (f.domain && f.domain.type === 'codedValue') {
      const m = new Map();
      for (const cv of f.domain.codedValues) m.set(cv.code, cv.name);
      domainMaps.set(f.name, m);
    }
  }
  // Some choice fields have domain: null in the schema (a known Survey123
  // quirk) even though they hold coded values - fill those in from a
  // hand-written lookup sourced from the actual form definition, but only
  // where the schema didn't already give us a real domain.
  for (const [fieldName, codeMap] of Object.entries(extraCodeLookups || {})) {
    if (!domainMaps.has(fieldName)) {
      domainMaps.set(fieldName, new Map(Object.entries(codeMap)));
    }
  }
  return domainMaps;
}

function buildFieldTypeMap(fieldsMeta) {
  return new Map(fieldsMeta.map((f) => [f.name, f.type]));
}

// Only capitalizes a leading lowercase letter (after any leading whitespace)
// - never touches the rest of the string. Safe to apply broadly: it's a
// no-op on anything already capitalized (our hand-written codeLookup labels,
// proper-noun institution names, prose that already starts with a capital),
// and only actually changes values like ALN's own choice-list domains that
// happen to define lowercase display text ("private", "academic", "urban").
function capitalizeFirst(str) {
  return str.replace(/^(\s*)([a-z])/, (_, ws, ch) => ws + ch.toUpperCase());
}

// Some fields store multi-select answers as a comma-joined string of codes
// (e.g. "GOAL_11:_Sustainable_Cities_and,GOAL_15:_Life_on_Land_"). Split on
// comma, look each piece up in the domain (falling back to the raw piece if
// it's not a known code), and rejoin with ", " for consistent spacing - a
// no-op for text that's already properly punctuated, so safe even on fields
// with no domain at all (e.g. countries_of_practice).
//
// Capitalization is gated on domainMap actually existing: an earlier version
// of this function capitalized every comma-split piece unconditionally,
// which silently corrupted ordinary prose containing commas (e.g. "...a
// Garden of Remembrance, is integrated..." became "...Remembrance, Is
// integrated..." - a real regression, caught by comparing generated output
// against a known-correct source text). Only genuine coded fields (where we
// have a domain/codeLookup, so we *know* each comma-separated piece is a
// discrete value, not a sentence fragment) get their casing normalized.
// `capitalize` defaults on but can be turned off per call - used for the two
// projects-template fields (verify_boundary_status, designed_created_assessed_by_)
// that get inserted mid-sentence and are meant to stay an exact match to
// ALN's own popup text, which is lowercase there by design.
function resolveValue(rawValue, domainMap, capitalize = true) {
  return rawValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const resolved = domainMap?.get(part) ?? part;
      return domainMap && capitalize ? capitalizeFirst(resolved) : resolved;
    })
    .join(', ');
}

// Survey123's naming convention: a field ending in "_other" is the free-text
// "please specify" companion to a preceding choice field - never itself a
// coded multi-select. On this org's data, these specific fields have a
// confirmed bug where spaces were replaced by commas somewhere upstream
// (verified: a genuine embedded comma like "Science, Archaeology" survives
// as a tell-tale double comma "Science,,Archaeology", proving only spaces
// were touched). Detected narrowly - only fires when the value has commas
// but literally zero spaces, so normal free text is never touched.
function isMangledFreeTextOther(fieldName, rawValue) {
  return fieldName.endsWith('_other') && rawValue.includes(',') && !rawValue.includes(' ');
}

function unmangleFreeTextOther(rawValue) {
  return rawValue
    .replace(/,+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ArcGIS date fields come back as epoch milliseconds. Format in UTC
// explicitly - these are typically stored as UTC midnight for date-only
// questions, and formatting in the build machine's local timezone could
// shift the displayed day depending on where/when the build runs.
function formatDate(epochMs) {
  return new Date(epochMs).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function buildFieldRows(attributes, fieldsMeta, excludeFieldNames, extraCodeLookups) {
  const domainMaps = buildDomainMaps(fieldsMeta, extraCodeLookups);
  const typeMap = buildFieldTypeMap(fieldsMeta);
  const aliasMap = new Map(fieldsMeta.map((f) => [f.name, f.alias || f.name]));

  const rows = [];
  for (const [name, rawValue] of Object.entries(attributes)) {
    if (excludeFieldNames.has(name)) continue;
    if (rawValue === null || rawValue === '' || rawValue === undefined) continue;

    let value;
    if (typeMap.get(name) === 'esriFieldTypeDate' && typeof rawValue === 'number') {
      value = formatDate(rawValue);
    } else if (typeof rawValue === 'string' && isMangledFreeTextOther(name, rawValue)) {
      value = unmangleFreeTextOther(rawValue);
    } else if (typeof rawValue === 'string') {
      value = resolveValue(rawValue, domainMaps.get(name));
    } else {
      value = rawValue;
    }

    rows.push({ field: name, label: aliasMap.get(name) || name, value });
  }
  return rows;
}

// Curated individuals profile - deliberately mirrors the exact field
// selection already used in ALN's own ArcGIS popup template for this layer
// (pulled from popupInfo.description on the live Instant App): professional
// status, bio, country of practice, qualifications, nationality, languages,
// sectors of work, institutions, biography link. Unlike buildFieldRows this
// never touches every field in the record - fields not in this list (e_mail,
// professional_number, etc.) are structurally never read, not just excluded.
function buildIndividualProfile(attrs, fieldsMeta, extraCodeLookups) {
  const domainMaps = buildDomainMaps(fieldsMeta, extraCodeLookups);

  const resolveField = (fieldName) => {
    const raw = attrs[fieldName];
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof raw !== 'string') return raw;
    if (isMangledFreeTextOther(fieldName, raw)) return unmangleFreeTextOther(raw);
    return resolveValue(raw, domainMaps.get(fieldName));
  };

  const sectorsOfWork = [
    resolveField('indicate_your_main_field_of_wor'),
    resolveField('other_areas_of_work'),
  ]
    .filter(Boolean)
    .join(', ');

  // other_institutions can include a literal "other" flag-token alongside
  // real institution codes, meaning "see the specify-other text field" - only
  // suppress that placeholder once we actually have specify-other text to
  // show in its place, so a checked-but-unspecified "other" still shows
  // *something* rather than silently vanishing.
  const institutionsOtherText = resolveField('other_institutions_other');
  const institutionsDomain = domainMaps.get('other_institutions');
  const institutions = (attrs.other_institutions || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((code) => institutionsDomain?.get(code) ?? code)
    .filter((label) => !(institutionsOtherText && /^other$/i.test(label)));
  if (institutionsOtherText) institutions.push(institutionsOtherText);

  return {
    name: `${attrs.name_ || ''} ${attrs.surname || ''}`.trim(),
    country: resolveField('country'), // index-page metadata only, not shown on the detail page (matches the popup template, which never references it either)
    professionalStatus: resolveField('current_professional_status'),
    about: resolveField('about_'),
    countryOfPractice: resolveField('countries_of_practice'),
    tertiaryQualifications: resolveField('tertiary_qualifications'),
    nationality: resolveField('nationality'),
    languages: resolveField('languages'),
    sectorsOfWork,
    institutions,
    biographyLink: attrs.biography_continued || '',
  };
}

// Converts every word to Title Case (first letter upper, rest lower) -
// matches Arcade's proper(text, 'everyword'), used by the projects popup's
// landscape-application cleanup.
function properEveryWord(str) {
  return str.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

// Comma-joined codes -> one label per line (used for the projects popup's
// "supports the following ALC principles / SDGs" lists, which render as a
// line-per-item list rather than a comma-joined sentence). `prefix` matches
// the "- " bullet the popup's own ALC choices bake into each label.
function buildNewlineList(rawValue, domainMap, prefix = '') {
  if (!rawValue) return '';
  return rawValue
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((code) => prefix + (domainMap?.get(code) ?? code))
    .join('\n');
}

// Curated projects profile - mirrors ALN's own Arcade-driven popup template
// for this layer exactly (pulled from the "Projects Map" layer's
// popupInfo.description + expressionInfos on the live Instant App, item
// 1f46f7336c22457ba6f50ce43dafa041). Unlike the individuals popup (a plain
// field-placeholder template), this one computes several values with Arcade
// expressions - each is reproduced here with its JS equivalent, noted inline.
function buildProjectProfile(attrs, fieldsMeta, extraCodeLookups, areaM2) {
  const domainMaps = buildDomainMaps(fieldsMeta, extraCodeLookups);

  const resolveField = (fieldName) => {
    const raw = attrs[fieldName];
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof raw !== 'string') return raw;
    if (isMangledFreeTextOther(fieldName, raw)) return unmangleFreeTextOther(raw);
    return resolveValue(raw, domainMaps.get(fieldName));
  };

  // Same as resolveField but skips casing normalization - for the two
  // fields (verify_boundary_status, designed_created_assessed_by_) that get
  // inserted mid-sentence and are meant to stay an exact match to ALN's own
  // popup text, which is lowercase there by design (user's explicit call).
  const resolveFieldExact = (fieldName) => {
    const raw = attrs[fieldName];
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof raw !== 'string') return raw;
    if (isMangledFreeTextOther(fieldName, raw)) return unmangleFreeTextOther(raw);
    return resolveValue(raw, domainMaps.get(fieldName), false);
  };

  // Arcade expr5 "Boundary_accurate": blank when the boundary is marked
  // accurate, otherwise appends the explanation for using an indicative one.
  const boundarySuffix =
    attrs.verify_boundary_status === 'Accurate_boundary'
      ? ''
      : `. ${attrs.explain_the_reason_for_the_use_ || ''}`;

  // Arcade expr4 "Complete_Year": year(...) - just the year, not a full date.
  const completionYear = attrs.please_select_the_year_of_compl
    ? new Date(attrs.please_select_the_year_of_compl).getUTCFullYear()
    : '';

  // Arcade expr10 "Project_Focus_CAPS": works on the RAW code (not the
  // domain-resolved name) because this field's codes carry a trailing
  // underscore standing in for a trailing space (e.g. "Design_") - replacing
  // underscores with spaces and capitalizing the first letter reproduces the
  // same result without needing the domain at all.
  const focusText = capitalizeFirst((attrs.project_focus || '').replace(/_/g, ' ')).trim();

  // Arcade expr8 "Landscape_Application_Clean": underscores -> spaces,
  // substitute the literal "other" token with the specify-other text (if
  // present), comma-space, then title-case every word. Deliberately
  // different from the generic project page's landscape_application
  // codeLookup (which uses the nicer form-defined labels) - this reproduces
  // the popup's own simpler raw-code transform, not that lookup.
  let landscapeApplication = (attrs.landscape_application || '').replace(/_/g, ' ');
  if (attrs.landscape_application_other) {
    landscapeApplication = landscapeApplication.replace(/\bother\b/g, attrs.landscape_application_other);
  }
  landscapeApplication = properEveryWord(landscapeApplication.replace(/,/g, ', '));

  return {
    name: attrs.project_name || '',
    country: resolveField('country'), // index-page metadata only, not shown on the detail page (matches the popup, which never references it either)
    // User's call (2026-08-10): show m²/km² as appropriate instead of the
    // popup's hectares - see formatArea() in lib/geo.js for the threshold.
    areaText: formatArea(areaM2),
    boundaryStatus: resolveFieldExact('verify_boundary_status'),
    boundarySuffix,
    synopsis: resolveField('synopsis_summary_overview'),
    relevantLink: attrs.please_add_any_other_links_rele || '',
    // Arcade expr9 "Project_Status_CAPS": proper(raw,'firstword') - raw code
    // for project_status happens to already equal its display name here.
    statusText: capitalizeFirst(attrs.project_status || ''),
    completionYear,
    projectBudget: attrs.project_budget || '',
    focusText,
    landscapeApplication,
    // Arcade expr11: proper(raw,'firstword'); template then appends the
    // literal word "entity" after it - that's baked into the template text,
    // not derived from any field.
    initiatedBy: capitalizeFirst(attrs.commissioned_by_client_ || ''),
    nameOfClient: attrs.name_of_client || '',
    designedBy: resolveFieldExact('designed_created_assessed_by_'),
    entityName: attrs._13_name_of_entity || '',
    alcList: buildNewlineList(
      attrs.support_of_alc_principles,
      domainMaps.get('support_of_alc_principles'),
      '- '
    ),
    alcSummary: resolveField('selected_alc_principles_within_'),
    sdgList: buildNewlineList(
      attrs.support_of_sustainable_developm,
      domainMaps.get('support_of_sustainable_developm')
    ),
    sdgSummary: resolveField('selected_sdgs_within_project_ex'),
    // Arcade expr12: proper(raw,'firstword').
    recognition: capitalizeFirst(attrs.formal_designation || ''),
    recognitionDetail: resolveField('formal_designation_recognition_'),
    recognitionLink: attrs.reference_link_to_formal_design || '',
    imagesReference: attrs.images_and_graphics_reference || '',
  };
}

// Unicode escapes (not literal combining-mark characters) so this survives
// copy/paste and different source-file encodings intact.
const ACCENT_MARKS = new RegExp('[̀-ͯ]', 'g');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(ACCENT_MARKS, '') // strip accents, e.g. "e" from "e"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { buildFieldRows, buildIndividualProfile, buildProjectProfile, slugify };
