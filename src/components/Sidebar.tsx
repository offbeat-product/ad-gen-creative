import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sparkles, History, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

const Sidebar = ({ open, onClose }: SidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-60 min-w-[240px] shrink-0 border-r bg-background transition-transform duration-300 lg:translate-x-0 lg:static lg:h-[calc(100vh-3.5rem)] lg:top-14",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + tagline (sidebar top, like Ad Check) */}
        <div className="px-4 pt-4 pb-2 border-b border-border lg:border-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold brand-gradient-text">∞ Ad Gen</h2>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">ルールと勝ちパターンから、AIがクリエイティブを生成。</p>
        </div>

        <nav className="space-y-1 px-3 py-2 whitespace-nowrap">
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
      </aside>
    </>
  );
};

export default Sidebar;
