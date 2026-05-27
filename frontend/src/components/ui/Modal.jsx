import { Icons } from '../common/Icons';

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(8,8,13,0.88)',
        backdropFilter: 'blur(8px)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border-2)',
          borderRadius: 4, padding: 18, width: '100%', maxWidth: 340,
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="disp-ex" style={{ fontSize: 18, textTransform: 'uppercase' }}>{title}</div>
            <button onClick={onClose} style={{ color: 'var(--text-2)', background: 'none', border: 0, cursor: 'pointer' }}>
              <Icons.close />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
