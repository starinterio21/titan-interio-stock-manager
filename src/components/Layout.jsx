import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['admin', 'manager', 'operator'] },
  { to: '/inventory', label: 'Inventory', icon: '📦', roles: ['admin', 'manager', 'operator'] },
  { to: '/low-stock', label: 'Low Stock', icon: '🟠', roles: ['admin', 'manager', 'operator'] },
  { to: '/out-of-stock', label: 'Out of Stock', icon: '🔴', roles: ['admin', 'manager', 'operator'] },
  { to: '/stock-in', label: 'Stock In', icon: '⬇️', roles: ['admin', 'manager', 'operator'] },
  { to: '/stock-out', label: 'Stock Out', icon: '⬆️', roles: ['admin', 'manager', 'operator'] },
  { to: '/projects', label: 'Projects', icon: '🏗️', roles: ['admin', 'manager', 'operator'] },
  { to: '/stock-adjustment', label: 'Stock Adjustment', icon: '🛠️', roles: ['admin', 'manager'] },
  { to: '/transactions', label: 'Transaction History', icon: '📜', roles: ['admin', 'manager', 'operator'] },
  { to: '/suppliers', label: 'Suppliers', icon: '🚚', roles: ['admin', 'manager'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['admin', 'manager'] },
  { to: '/users', label: 'Users', icon: '👥', roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: '⚙️', roles: ['admin'] },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(profile?.role))

  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between bg-titan-dark text-white px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Titan Interio" className="w-8 h-8 object-contain" />
          <span className="text-titan-gold font-bold text-sm">TITAN INTERIO</span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-white p-2 -mr-2"
          aria-label="Open menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar — slides in on mobile, static on desktop */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 h-screen w-64 bg-titan-dark text-white flex flex-col shrink-0 z-50
            transform transition-transform duration-200 ease-in-out
            ${menuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          `}
        >
          <div className="flex items-center justify-between lg:justify-center py-6 px-4 border-b border-white/10">
            <div className="flex flex-col items-center flex-1">
              <img src="/logo.png" alt="Titan Interio" className="w-16 h-16 lg:w-20 lg:h-20 object-contain mb-2" />
              <h1 className="text-titan-gold font-bold text-sm text-center leading-tight px-2">
                TITAN INTERIO
              </h1>
              <p className="text-[10px] text-gray-400 tracking-wide">STOCK MANAGER</p>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white p-1"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-titan-gold/10 text-titan-gold border-r-2 border-titan-gold font-medium'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-gray-400 truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-titan-gold uppercase tracking-wide">{profile?.role}</p>
            <button
              onClick={handleSignOut}
              className="mt-3 w-full text-xs bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-gray-50 min-h-screen overflow-x-hidden w-full">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
