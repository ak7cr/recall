import { useEffect, useState, type ComponentType } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CheckSquare,
  GitCompare,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { ToastProvider } from './components';
import { ThemeProvider, useTheme } from './theme';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import Meetings from './pages/Meetings';
import Workspace from './pages/Workspace';
import Chat from './pages/Chat';
import Actions from './pages/Actions';
import Compare from './pages/Compare';
import SettingsPage from './pages/Settings';

const NAV: { path: string; label: string; icon: ComponentType<{ size?: number | string }> }[] = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/meetings', label: 'Meetings', icon: CalendarDays },
  { path: '/chat', label: 'Ask Recall', icon: MessagesSquare },
  { path: '/actions', label: 'Action tracker', icon: CheckSquare },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-base font-bold text-brand-fg">
        R
      </span>
      <span className="leading-tight">
        <span className="block text-[0.95rem] font-semibold tracking-tight">Recall</span>
        <span className="block text-[0.68rem] uppercase tracking-wider text-muted">Meeting intelligence</span>
      </span>
    </Link>
  );
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={
        compact
          ? 'grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:text-ink'
          : 'navlink w-full'
      }
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      {!compact && <span>{dark ? 'Light theme' : 'Dark theme'}</span>}
    </button>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Main">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function NotFound() {
  return (
    <div className="card card-pad text-center">
      <p className="text-sm font-semibold">Page not found</p>
      <p className="mt-1 text-sm text-muted">That page does not exist in Recall.</p>
      <Link to="/" className="btn mt-4">
        Back to overview
      </Link>
    </div>
  );
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* jsdom and some embedded browsers do not implement scrollTo */
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-app text-ink md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lift"
      >
        Skip to content
      </a>

      <aside className="hidden border-r border-line bg-surface px-4 py-5 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="px-1">
          <Brand />
        </div>
        <div className="mt-7 flex-1">
          <NavItems />
        </div>
        <div className="space-y-2 border-t border-line pt-3">
          <ThemeToggle />
          <p className="px-3 text-[0.68rem] leading-relaxed text-muted">
            Local workspace
          </p>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            role="presentation"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface px-4 py-5 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                aria-label="Close navigation"
                className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted"
                onClick={() => setMenuOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-7 flex-1">
              <NavItems onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="border-t border-line pt-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            aria-label="Open navigation"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:text-ink md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted lg:block">Searchable, evidence-linked meeting memory</span>
            <ThemeToggle compact />
            <Link to="/upload" className="btn">
              <Upload size={15} />
              <span className="hidden sm:inline">Add meeting</span>
            </Link>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/meetings/:id" element={<Workspace />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </ThemeProvider>
  );
}
