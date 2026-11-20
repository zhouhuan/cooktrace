/**
 * units.js — canonical cooking unit catalog.
 *
 * Stored value is the short abbreviation (the field saves "tsp", not
 * "teaspoon"). Display in pickers shows the full name plus the abbr.
 *
 * Free-text is still allowed everywhere — anything not in this list
 * (e.g. "splash", "drizzle", "to taste") stays as the user typed it.
 */

export const UNIT_GROUPS = [
  {
    label: '体积—美制',
    units: [
      { abbr: 'tsp',   full: '茶匙' },
      { abbr: 'tbsp',  full: '汤匙' },
      { abbr: 'fl oz', full: '液量盎司' },
      { abbr: 'cup',   full: '杯' },
      { abbr: 'pt',    full: '品脱' },
      { abbr: 'qt',    full: '夸脱' },
      { abbr: 'gal',   full: '加仑' },
    ],
  },
  {
    label: '体积—公制',
    units: [
      { abbr: 'ml', full: '毫升' },
      { abbr: 'cl', full: '厘升' },
      { abbr: 'dl', full: '分升' },
      { abbr: 'l',  full: '升' },
    ],
  },
  {
    label: '重量—美制',
    units: [
      { abbr: 'oz', full: '盎司' },
      { abbr: 'lb', full: '磅' },
    ],
  },
  {
    label: '重量—公制',
    units: [
      { abbr: 'mg', full: '毫克' },
      { abbr: 'g',  full: '克' },
      { abbr: 'kg', full: '千克' },
    ],
  },
  {
    label: '市制',
    units: [
      { abbr: 'jin',   full: '斤' },
      { abbr: 'liang', full: '两' },
    ],
  },
  {
    label: '计数/其他',
    units: [
      { abbr: 'pc',       full: '个' },
      { abbr: 'whole',    full: '整个' },
      { abbr: 'clove',    full: '瓣' },
      { abbr: 'sprig',    full: '枝' },
      { abbr: 'slice',    full: '片' },
      { abbr: 'stick',    full: '根' },
      { abbr: 'pinch',    full: '一小撮' },
      { abbr: 'dash',     full: '少许' },
      { abbr: 'drop',     full: '滴' },
      { abbr: 'splash',   full: '少量' },
      { abbr: 'handful',  full: '一把' },
      { abbr: 'bunch',    full: '一束' },
      { abbr: 'head',     full: '颗' },
      { abbr: 'stalk',    full: '梗' },
      { abbr: 'can',      full: '罐' },
      { abbr: 'jar',      full: '玻璃罐' },
      { abbr: 'bottle',   full: '瓶' },
      { abbr: 'pkg',      full: '包' },
      { abbr: 'box',      full: '盒' },
      { abbr: 'bag',      full: '袋' },
      { abbr: 'to taste', full: '适量' },
    ],
  },
];

/**
 * Merge the server-side units overlay into the built-in catalog.
 *
 * Args:
 *   overlay = { disabled: string[] of abbrs, custom: [{abbr, full_name, category}] }
 *
 * Built-ins matching `disabled` are filtered out (groups with zero
 * remaining units are dropped). Customs are grouped by their stored
 * `category`: ones whose category exactly matches a built-in group
 * label are merged into that group; everything else lands in a single
 * "Custom" group at the top.
 */
export function unitGroupsMerged(overlay) {
  const disabled = new Set((overlay?.disabled || []).map(s => String(s)));
  const customs  = Array.isArray(overlay?.custom) ? overlay.custom : [];

  // Bucket customs by their declared category.
  const customByCategory = new Map();
  const looseCustoms = [];
  for (const c of customs) {
    const u = { abbr: c.abbr, full: c.full_name || c.abbr };
    const cat = String(c.category || '').trim();
    if (!cat || cat === 'Custom') { looseCustoms.push(u); continue; }
    const arr = customByCategory.get(cat);
    if (arr) arr.push(u);
    else customByCategory.set(cat, [u]);
  }

  // Walk built-in groups, filter disabled, and append matching customs.
  const groups = [];
  for (const g of UNIT_GROUPS) {
    const remaining = g.units.filter(u => !disabled.has(u.abbr));
    const extras = customByCategory.get(g.label) || [];
    const merged = [...remaining, ...extras];
    if (merged.length > 0) groups.push({ label: g.label, units: merged });
    customByCategory.delete(g.label);
  }
  // Anything still in customByCategory is for an unknown category name —
  // treat as Custom-bucket entries.
  for (const arr of customByCategory.values()) looseCustoms.push(...arr);

  if (looseCustoms.length > 0) {
    groups.unshift({ label: 'Custom', units: looseCustoms });
  }
  return groups;
}
