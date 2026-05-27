export default function Pager({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null;
  const btnStyle = (disabled) => ({
    width: 30, height: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)', borderRadius: 3,
    color: disabled ? 'var(--text-3)' : 'var(--text-2)',
    background: 'var(--surface)', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
    fontFamily: "'Saira Condensed', sans-serif", fontWeight: 700, fontSize: 14, lineHeight: 1,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
      <button disabled={page === 0} onClick={() => onPage(page - 1)} style={btnStyle(page === 0)}>‹</button>
      <span className="label-eyebrow num" style={{ minWidth: 70, textAlign: 'center', color: 'var(--text-2)' }}>
        PAGE {page + 1} / {pageCount}
      </span>
      <button disabled={page === pageCount - 1} onClick={() => onPage(page + 1)} style={btnStyle(page === pageCount - 1)}>›</button>
    </div>
  );
}
