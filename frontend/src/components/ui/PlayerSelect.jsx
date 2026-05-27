import { Icons } from '../common/Icons';

export default function PlayerSelect({ players = [], value, onChange, exclude, placeholder = 'Select player…' }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value ?? ''}
        onChange={e => onChange(Number(e.target.value) || null)}
        className="select"
      >
        <option value="">{placeholder}</option>
        {players
          .filter(p => p.id !== exclude)
          .map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.mmr} MMR)</option>
          ))}
      </select>
      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }}>
        <Icons.chevDown />
      </div>
    </div>
  );
}
