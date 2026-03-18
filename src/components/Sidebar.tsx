import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sparkles, History, Settings, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' },
  { to: '/generate', icon: Sparkles, label: '新規生成' },
  { to: '/history', icon: History, label: '生成履歴' },
  { to: '/settings', icon: Settings, label: '設定' },
];

const productLinks = [
  { label: 'AdLoop', url: 'https://adloop-portal.lovable.app/', active: true },
  { label: 'Ad Brain', url: 'https://ad-brain.lovable.app/', active: true },
  { label: 'Ad Check', url: 'https://ad-check.lovable.app/', active: true },
  { label: 'Ad Ops', url: null, active: false },
];

const Sidebar = ({ open, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-60 min-w-[240px] shrink-0 border-r bg-background transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-14 px-4 flex items-center border-b border-border bg-white">
          <h2 className="text-lg font-bold brand-gradient-text whitespace-nowrap">∞ Ad Gen</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-1 px-3 py-3 whitespace-nowrap flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-wash text-primary border-l-[3px] border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Other products */}
        <div className="px-3 pb-4">
          <Separator className="mb-3" />
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Other Products
          </p>
          <div className="space-y-0.5">
            {productLinks.map((p) =>
              p.active && p.url ? (
                <a
                  key={p.label}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <span>{p.label}</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </a>
              ) : (
                <span
                  key={p.label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40 cursor-default"
                >
                  {p.label}
                  <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">準備中</span>
                </span>
              )
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
