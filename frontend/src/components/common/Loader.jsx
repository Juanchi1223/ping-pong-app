export function PageLoader() {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skel" style={{ height: 52, borderRadius: 4 }} />
      ))}
    </div>
  );
}

export function PageError({ message = 'Error al cargar los datos.' }) {
  return (
    <div style={{
      margin: 24, padding: '12px 16px',
      background: 'rgba(251,113,133,0.08)',
      border: '1px solid var(--loss)',
      borderRadius: 4, color: 'var(--loss)', fontSize: 13,
    }}>
      ⚠ {message}
    </div>
  );
}
