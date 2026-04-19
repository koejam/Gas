import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Add' },
  { to: '/history', label: 'History' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              end={tab.to === '/'}
              to={tab.to}
              className={({ isActive }) =>
                `block text-center py-3 text-sm ${isActive ? 'text-brand-accent' : 'text-slate-400'}`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
