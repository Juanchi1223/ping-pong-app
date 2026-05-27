import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Icons } from './common/Icons';

const navItems = [
    { to: '/',        label: 'Rankings',  icon: Icons.trophy,  exact: true },
    { to: '/h2h',     label: 'H2H',       icon: Icons.swords },
    { to: '/register',label: 'New Match', icon: Icons.plus, center: true },
    { to: '/history', label: 'History',   icon: Icons.clock },
    { to: '/players', label: 'Players',   icon: Icons.users },
];

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col flex-shrink-0" style={{ width: 200, borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 4, background: 'rgba(255,61,84,0.15)', border: '1px solid rgba(255,61,84,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              🏓
            </div>
            <div>
              <div className="disp-ex" style={{ fontSize: 18, lineHeight: 1 }}>PingPongZS</div>
              <div className="label-eyebrow" style={{ marginTop: 2, fontSize: 9 }}>Rankings</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.filter(n => !n.center).map(({ to, label, icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-body transition-all duration-150 relative ${isActive ? 'nav-active' : ''}`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(255,61,84,0.07)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: isActive ? 500 : 400,
              })}
            >
              {icon({ width: 16, height: 16, style: { flexShrink: 0 } })}
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div className="label-eyebrow" style={{ fontSize: 9, color: 'var(--text-3)' }}>K-Factor = 32</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 flex items-center justify-around px-2 py-1.5 z-50" style={{ background: 'rgba(17,17,24,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
        {navItems.map(({ to, label, icon, exact, center }) => {
          if (center) {
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="pressable"
                style={{
                  width: 48, height: 48, borderRadius: 6,
                  background: 'var(--accent)', color: '#0a0a0d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 0, cursor: 'pointer',
                  boxShadow: '0 6px 18px var(--accent-2)',
                }}
              >
                {icon({ width: 22, height: 22 })}
              </button>
            );
          }
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-[10px] font-body transition-all duration-150"
              style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-3)' })}
            >
              {icon({ width: 20, height: 20 })}
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
