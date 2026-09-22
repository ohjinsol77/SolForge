import { entries } from './menu-catalog.mjs';

export const MENU_VISIBILITIES = new Set(['public', 'hidden', 'admin']);
const entryKeys = new Set(entries.map((entry) => entry.key));

export function defaultMenuVisibility() {
  return Object.fromEntries(entries.map((entry) => [entry.key, 'public']));
}

export async function readMenuVisibility(env) {
  const visibility = defaultMenuVisibility();
  if (!env.ANALYTICS_DB) return visibility;
  try {
    const result = await env.ANALYTICS_DB.prepare('SELECT menu_key, visibility FROM menu_visibility').all();
    for (const row of result.results || []) {
      if (entryKeys.has(row.menu_key) && MENU_VISIBILITIES.has(row.visibility)) visibility[row.menu_key] = row.visibility;
    }
  } catch (_error) {
    // The migration may not have been applied yet. Public defaults keep the site usable.
  }
  return visibility;
}

export async function saveMenuVisibility(env, settings) {
  if (!env.ANALYTICS_DB || !Array.isArray(settings) || settings.length > entries.length) throw Error('Invalid menu settings');
  const seen = new Set();
  const statements = [];
  for (const item of settings) {
    if (!item || typeof item.key !== 'string' || !entryKeys.has(item.key) || seen.has(item.key) || !MENU_VISIBILITIES.has(item.visibility)) throw Error('Invalid menu settings');
    seen.add(item.key);
    if (item.visibility === 'public') {
      statements.push(env.ANALYTICS_DB.prepare('DELETE FROM menu_visibility WHERE menu_key=?').bind(item.key));
    } else {
      statements.push(env.ANALYTICS_DB.prepare('INSERT INTO menu_visibility(menu_key,visibility,updated_at) VALUES(?,?,?) ON CONFLICT(menu_key) DO UPDATE SET visibility=excluded.visibility,updated_at=excluded.updated_at').bind(item.key, item.visibility, Math.floor(Date.now() / 1000)));
    }
  }
  for (let index = 0; index < statements.length; index += 50) await env.ANALYTICS_DB.batch(statements.slice(index, index + 50));
  return readMenuVisibility(env);
}

export function menuEntries() {
  return entries;
}
