import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const services = [
  { name: 'Supabase Auth', connected: true, action: null },
  { name: 'Ad Brain', connected: true, action: '設定' },
  { name: 'Ad Check', connected: true, action: '設定' },
  { name: 'Ad Ops', connected: false, action: 'Coming Soon' },
];

const SettingsAccount = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const email = user?.email ?? 'daiki.ide@offbeat.co.jp';
  const initial = email[0]?.toUpperCase() ?? 'U';

  const [name, setName] = useState('daiki.ide');
  const [company, setCompany] = useState('Off Beat株式会社');
  const [title, setTitle] = useState('代表取締役');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base">プロフィール情報</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-secondary-foreground shrink-0">{initial}</div>
            <button className="text-sm text-secondary hover:underline">画像を変更</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>名前</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>メールアドレス</Label><Input value={email} readOnly className="bg-muted" /></div>
            <div className="space-y-1.5"><Label>会社名</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>役職</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          </div>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => toast({ title: 'プロフィールを更新しました' })}>プロフィールを更新</Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader><CardTitle className="text-base">パスワード変更</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>現在のパスワード</Label><Input type="password" className="max-w-sm" /></div>
          <div className="space-y-1.5"><Label>新しいパスワード</Label><Input type="password" className="max-w-sm" /></div>
          <div className="space-y-1.5"><Label>新しいパスワード（確認）</Label><Input type="password" className="max-w-sm" /></div>
          <Button variant="outline" onClick={() => toast({ title: 'パスワードを変更しました' })}>パスワードを変更</Button>
        </CardContent>
      </Card>

      {/* Connected Services */}
      <Card>
        <CardHeader><CardTitle className="text-base">接続サービス</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2 font-medium">サービス</th>
                  <th className="text-left p-2 font-medium">ステータス</th>
                  <th className="text-left p-2 font-medium">アクション</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.name} className="border-b last:border-0">
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2">
                      <Badge className={cn('text-xs', s.connected ? 'bg-success-wash text-success' : 'bg-muted text-muted-foreground')}>
                        {s.connected ? '接続済み' : '未接続'}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {s.action === 'Coming Soon' ? (
                        <span className="text-xs text-muted-foreground">Coming Soon</span>
                      ) : s.action ? (
                        <Button variant="ghost" size="sm" className="text-xs">{s.action}</Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Data & Plan */}
      <Card>
        <CardHeader><CardTitle className="text-base">データ・プラン</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">現在のプラン:</span>
            <Badge className="bg-secondary-wash text-secondary">Ad Gen Pro</Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">今月の使用量</span>
              <span className="font-medium">134本 / 500本</span>
            </div>
            <Progress value={27} className="h-2" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setComingSoonOpen(true)}>プランを変更</Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader><CardTitle className="text-base text-destructive">危険な操作</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">アカウントを削除すると、すべてのデータが永久に失われます。</p>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
            アカウントを削除
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アカウント削除の確認</AlertDialogTitle>
            <AlertDialogDescription>本当にアカウントを削除しますか？この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => toast({ title: 'この機能はデモ版では利用できません' })}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coming Soon */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>Coming Soon</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">プラン変更機能は準備中です。</p>
          <DialogFooter className="justify-center">
            <Button variant="outline" onClick={() => setComingSoonOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SettingsAccount;
