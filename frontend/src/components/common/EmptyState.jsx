export default function EmptyState({ icon = '🏓', message = 'No hay datos aún.' }) {
  return (
    <div style={{
      padding: 32, textAlign: 'center',
      border: '1px dashed var(--border)', borderRadius: 4,
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div className="disp" style={{ fontSize: 13, color: 'var(--text-2)' }}>{message}</div>
    </div>
  );
}
