import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBasket,
  Receipt,
  PieChart,
  Users,
  Shield,
  LogOut,
} from 'lucide-react'
import Logo from './Logo'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import { useTick } from '../hooks/useData'
import { dhakaNow } from '../lib/utils'
import { APP_TAGLINE, MESS_NAME } from '../lib/constants'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed },
  { to: '/bazar', label: 'Bazar', icon: ShoppingBasket },
  { to: '/expenses', label: 'Bills', icon: Receipt },
  { to: '/report', label: 'Report', icon: PieChart },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
]

function Clock() {
  useTick(1000)
  const now = dhakaNow()
  return (
    <div className="text-right">
      <div className="font-extrabold tabular-nums text-sm">
        {now.hh}:{now.mm}
        <span className="text-ink/40">:{now.ss}</span>
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Dhaka time</div>
    </div>
  )
}

export default function Layout() {
  const { member, user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const displayName = member?.nickname || user?.email || ''
  const nav = NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 p-4 gap-2 no-print">
        <div className="card flex-1 flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-3">
            <Logo size={46} />
            <div>
              <div className="font-extrabold text-lg leading-tight">{MESS_NAME}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {APP_TAGLINE}
              </div>
            </div>
          </div>
          <nav className="mt-4 flex flex-col gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-sm transition
                  ${isActive ? 'text-white' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon size={18} className="relative z-10" />
                    <span className="relative z-10">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-ink/8">
            <div className="flex items-center gap-3 px-2">
              <Avatar name={member?.name || displayName} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{displayName}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                  {member?.role ?? 'guest'}
                </div>
              </div>
              <button className="btn-ghost p-2 rounded-xl" onClick={logout} title="Log out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 px-4 pt-3 pb-2 no-print">
        <div className="card px-4 py-2.5 flex items-center gap-3">
          <Logo size={36} />
          <div className="flex-1">
            <div className="font-extrabold leading-tight">{MESS_NAME}</div>
          </div>
          <Clock />
          <button className="btn-ghost p-2 rounded-xl" onClick={logout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="px-4 lg:px-8 pt-2 lg:pt-6 pb-28 lg:pb-10 max-w-6xl mx-auto">
        <div className="hidden lg:flex justify-end mb-2 no-print">
          <Clock />
        </div>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile bottom nav — icons only; the active item grows a label */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 no-print">
        <div className="card flex justify-around items-center px-1.5 py-2 rounded-3xl">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-2xl transition-all duration-200
                ${isActive ? 'text-white bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/30 px-3 py-2' : 'text-ink/45 px-2 py-2'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} />
                  {isActive && <span className="text-[10px] font-extrabold whitespace-nowrap">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
