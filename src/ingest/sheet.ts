export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1g2-76SolXVpsw-bbcZuwslDduXo8Lnb0C9dxV3kv_sE/export?format=csv&gid=107710525';

export async function fetchSheetCsv(url: string = SHEET_CSV_URL, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(url, { headers: { 'User-Agent': 'snooze-loot-dashboard' } });
  if (!res.ok) throw new Error(`sheet fetch failed: HTTP ${res.status ?? '??'}`);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('sheet fetch returned HTML, not CSV (is the sheet still public?)');
  return text;
}
