import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Pay Periods', path: '/pay-periods' },
  { label: 'Forecast', path: '/forecast' },
  { label: 'Money Mover', path: '/money-mover' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'History', path: '/history' },
  { label: 'Accounts', path: '/accounts' },
  { label: 'Settings', path: '/settings' }
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-[2rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm shadow-slate-200/50 backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Budget OS</p>
            <h1 className="text-2xl font-semibold text-slate-900">Paycheck allocation & forecasting</h1>
          </div>
          <div className="hidden items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm shadow-slate-200/50 md:flex">
            <span>Safe spend planning for your next pay period</span>
          </div>
        </header>

        <div className="grid flex-1 gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/60 backdrop-blur">
            <div className="mb-6 space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-2xl font-semibold text-slate-700 shadow-inner shadow-slate-200/70">B</div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Workspace</p>
                <h2 className="text-xl font-semibold text-slate-900">Budget OS</h2>
              </div>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `block rounded-3xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500">Modern financial planning</p>
                <h2 className="text-3xl font-semibold text-slate-950">Your future cashflow at a glance</h2>
              </div>
              <button className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800">
                New allocation
              </button>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
