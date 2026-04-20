import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SettingsAccount = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const email = user?.email ?? '';
  const initial = email[0]?.toUpperCase() ?? 'U';

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'ログアウトしました' });
    navigate('/login');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">プロフィール</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground shrink-0">
              {initial}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{email}</p>
              <p className="text-xs text-muted-foreground">ログイン中</p>
            </div>
          </div>
          <div className="space-y-1.5 max-w-md">
            <Label>メールアドレス</Label>
            <Input value={email} readOnly className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">セッション</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SettingsAccount;
