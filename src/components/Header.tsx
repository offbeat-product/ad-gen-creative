import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const userName = user?.email?.split('@')[0] ?? '';

  return (
    <header className="flex h-14 items-center justify-end border-b bg-white px-4 lg:px-6 sticky top-0 z-50">
      <Button variant="ghost" size="icon" className="lg:hidden mr-auto" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </Button>
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
