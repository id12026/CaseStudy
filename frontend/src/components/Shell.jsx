import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Code2,
  Gauge,
  LineChart,
  Menu,
  Moon,
  Search,
  Sun,
  TrendingUp,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "state", label: "State Forecast", icon: TrendingUp },
  { id: "models", label: "Model Comparison", icon: BrainCircuit },
  { id: "history", label: "Historical Analysis", icon: BarChart3 },
  { id: "api", label: "API Tester", icon: Code2 }
];

export function Shell({ activePage, setActivePage, darkMode, setDarkMode, children, offline }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("light", !darkMode);
  }, [darkMode]);

  const activeLabel = useMemo(
    () => navItems.find((item) => item.id === activePage)?.label || "Dashboard",
    [activePage]
  );

  const Nav = ({ mobile = false }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-3 px-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rainbow-edge shadow-glow">
          <LineChart className="h-6 w-6 text-white" />
        </div>
        {!collapsed || mobile ? (
          <div>
            <p className="font-display text-lg font-black text-white light:text-slate-950">ForecastIQ</p>
            <p className="text-xs font-bold text-slate-400 light:text-slate-500">Sales intelligence</p>
          </div>
        ) : null}
      </div>

      <nav className="space-y-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item w-full ${active ? "nav-item-active" : ""} ${collapsed && !mobile ? "justify-center px-0" : ""}`}
              onClick={() => {
                setActivePage(item.id);
                setMobileOpen(false);
              }}
              title={item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed || mobile ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4">
        <div className={`subtle-panel p-3 ${collapsed && !mobile ? "text-center" : ""}`}>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${offline ? "bg-amberglow" : "bg-cyanic"}`} />
            {!collapsed || mobile ? (
              <span className="text-xs font-extrabold text-slate-300 light:text-slate-600">
                {offline ? "Mock data active" : "API connected"}
              </span>
            ) : null}
          </div>
          {!collapsed || mobile ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500 light:text-slate-500">
              Forecasts refresh from backend artifacts with graceful mock fallback.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-premium-dark text-white light:bg-premium-light light:text-slate-950">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-rainbow-edge opacity-80" />

      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-white/10 bg-midnight/72 backdrop-blur-2xl transition-all duration-300 light:border-slate-900/10 light:bg-white/80 lg:block ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <Nav />
        <button
          type="button"
          className="icon-button absolute -right-5 top-24"
          onClick={() => setCollapsed((value) => !value)}
          aria-label="Collapse sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.aside
              className="h-full w-80 border-r border-white/10 bg-midnight light:bg-white"
              initial={{ x: -340 }}
              animate={{ x: 0 }}
              exit={{ x: -340 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
            >
              <button
                type="button"
                className="icon-button absolute right-4 top-4"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <Nav mobile />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className={`transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <header className="sticky top-0 z-20 border-b border-white/10 bg-midnight/60 backdrop-blur-2xl light:border-slate-900/10 light:bg-white/70">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex items-center gap-3">
              <button type="button" className="icon-button lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyanic">Forecast command center</p>
                <h1 className="font-display text-xl font-black sm:text-2xl">{activeLabel}</h1>
              </div>
            </div>

            <div className="hidden min-w-72 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 light:border-slate-900/10 light:bg-white/70 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-400 light:text-slate-500">
                Search states, models, forecasts
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="secondary-button hidden sm:flex">
                <CalendarRange className="h-4 w-4" />
                Last 12 months
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDarkMode((value) => !value)}
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 xl:px-8">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ kicker, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div className="max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyanic">{kicker}</p>
        <h2 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          <span className="gradient-text">{title}</span>
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 light:text-slate-600 sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ message = "Loading forecast intelligence" }) {
  return (
    <div className="grid min-h-[420px] place-items-center">
      <div className="text-center">
        <Activity className="mx-auto h-10 w-10 animate-pulse text-cyanic" />
        <p className="mt-4 text-sm font-bold text-slate-400">{message}</p>
      </div>
    </div>
  );
}

