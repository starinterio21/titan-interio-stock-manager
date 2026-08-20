import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['admin', 'manager', 'operator'] },
  { to: '/inventory', label: 'Inventory', icon: '📦', roles: ['admin', 'manager', 'operator'] },
  { to: '/stock-in', label: 'Stock In', icon: '⬇️', roles: ['admin', 'manager', 'operator'] },
  { to: '/stock-out', label: 'Stock Out', icon: '⬆️', roles: ['admin', 'manager', 'operator'] },
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

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(profile?.role))

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-titan-dark text-white flex flex-col shrink-0">
        <div className="flex flex-col items-center py-6 border-b border-white/10">
          <img src="/logo.png" alt="Titan Interio" className="w-20 h-20 object-contain mb-2" />
          <h1 className="text-titan-gold font-bold text-sm text-center leading-tight px-2">
            TITAN INTERIO
          </h1>
          <p className="text-[10px] text-gray-400 tracking-wide">STOCK MANAGER</p>
        </div>

        <nav className="flex-1 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
      <main className="flex-1 bg-gray-50 min-h-screen overflow-x-hidden">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
