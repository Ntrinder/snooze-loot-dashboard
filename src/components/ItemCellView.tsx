import type { ItemCell } from '../lib/compute';
import { qualityColor } from '../lib/quality';

export function ItemCellView({ cell }: { cell: ItemCell }) {
  const color = cell.isTier && cell.quality === null ? 'var(--color-accent-300)' : qualityColor(cell.quality);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, whiteSpace: 'nowrap' }}>
      {cell.icon && (
        <img
          src={`https://wow.zamimg.com/images/wow/icons/medium/${cell.icon}.jpg`}
          alt=""
          width={16}
          height={16}
          style={{ border: `1px solid ${color}`, borderRadius: 2 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {cell.label}
    </span>
  );
}
