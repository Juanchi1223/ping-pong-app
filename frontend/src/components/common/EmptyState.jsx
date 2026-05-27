export default function EmptyState({ message = 'No hay datos aún.' }) {
  return (
    <div style={{
      padding: 32, textAlign: 'center',
      border: '1px dashed var(--border)', borderRadius: 4,
    }}>
      <div className="disp" style={{ fontSize: 13, color: 'var(--text-2)' }}>{message}</div>
    </div>
  );
}
