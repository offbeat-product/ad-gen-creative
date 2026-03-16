import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
  const { user, signOut } = useAuth();

  const userName = user?.email?.split('@')[0] ?? '';

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold brand-gradient-text">∞ Ad Gen</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">{userName}</span>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">ログアウト</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
