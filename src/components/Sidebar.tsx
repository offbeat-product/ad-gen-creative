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
          "fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-60 border-r bg-background transition-transform duration-300 lg:translate-x-0 lg:static",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-end p-2 lg:hidden">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-1 px-3 py-2">
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
                    ? "bg-secondary-wash text-secondary border-l-[3px] border-secondary"
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
