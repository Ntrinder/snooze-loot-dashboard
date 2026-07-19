export async function fetchItemMeta(
  itemId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<{ name: string; quality: number; icon: string } | null> {
  try {
    const res = await fetchImpl(`https://nether.wowhead.com/tbc/tooltip/item/${itemId}`, {
      headers: { 'User-Agent': 'snooze-loot-dashboard (github.com/Ntrinder/snooze-loot-dashboard)' },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { name?: unknown; quality?: unknown; icon?: unknown };
    if (!j || typeof j.name !== 'string') return null;
    return {
      name: j.name,
      quality: typeof j.quality === 'number' ? j.quality : 0,
      icon: typeof j.icon === 'string' ? j.icon : '',
    };
  } catch {
    return null;
  }
}
