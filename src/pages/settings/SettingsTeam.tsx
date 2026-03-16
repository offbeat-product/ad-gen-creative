import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Edit2, Trash2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface Member {
  name: string; email: string; role: string; status: string; lastLogin: string;
  avatarColor: string; initial: string; isAdmin?: boolean;
}

const members: Member[] = [
  { name: '井手 大貴', email: 'daiki.ide@offbeat.co.jp', role: '管理者', status: 'アクティブ', lastLogin: '2026/03/17', avatarColor: 'bg-secondary', initial: 'D', isAdmin: true },
  { name: '田中', email: 'tanaka@offbeat.co.jp', role: '編集者', status: 'アクティブ', lastLogin: '2026/03/16', avatarColor: 'bg-primary', initial: 'T' },
  { name: '鈴木', email: 'suzuki@offbeat.co.jp', role: '編集者', status: 'アクティブ', lastLogin: '2026/03/15', avatarColor: 'bg-success', initial: 'S' },
  { name: '佐藤', email: 'sato@offbeat.co.jp', role: '閲覧者', status: '招待中', lastLogin: '—', avatarColor: 'bg-warning', initial: 'S' },
];

const roleDescriptions = [
  { role: '管理者', desc: '全機能へのアクセス + 設定変更 + メンバー管理' },
  { role: '編集者', desc: '生成・編集・ダウンロード・プロに依頼。設定変更・メンバー管理は不可' },
  { role: '閲覧者', desc: '生成結果の閲覧・ダウンロードのみ' },
];

const SettingsTeam = () => {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      {/* Top */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{members.length}名のメンバー</span>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1" />メンバーを招待
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left p-3 font-medium">メンバー</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">メール</th>
              <th className="text-left p-3 font-medium">権限</th>
              <th className="text-left p-3 font-medium">ステータス</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">最終ログイン</th>
              <th className="text-left p-3 font-medium">アクション</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.email} className="border-b last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', m.avatarColor)}>{m.initial}</div>
                    <span className="font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{m.email}</td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{m.role}</Badge></td>
                <td className="p-3">
                  <Badge className={cn('text-xs', m.status === 'アクティブ' ? 'bg-success-wash text-success' : 'bg-warning-wash text-warning')}>{m.status}</Badge>
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{m.lastLogin}</td>
                <td className="p-3">
                  {m.isAdmin ? <span className="text-xs text-muted-foreground">—</span> : (
                    <div className="flex items-center gap-1">
                      {m.status === '招待中' ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast({ title: '招待メールを再送しました' })}><RotateCw className="h-3.5 w-3.5" /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(m.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role descriptions */}
      <Card>
        <CardHeader><CardTitle className="text-base">権限レベル</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {roleDescriptions.map(r => (
            <div key={r.role} className="flex items-start gap-3">
              <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{r.role}</Badge>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>メンバーを招待</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>メールアドレス *</Label><Input type="email" placeholder="email@example.com" /></div>
            <div className="space-y-1.5">
              <Label>権限</Label>
              <Select defaultValue="編集者">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="編集者">編集者</SelectItem>
                  <SelectItem value="閲覧者">閲覧者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>メッセージ（任意）</Label><Textarea placeholder="招待メッセージを追加..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={() => { setInviteOpen(false); toast({ title: '招待メールを送信しました' }); }}>招待を送信</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>メンバー編集</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>権限変更</Label>
              <Select defaultValue="編集者">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="編集者">編集者</SelectItem>
                  <SelectItem value="閲覧者">閲覧者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={() => { setEditOpen(false); toast({ title: '権限を更新しました' }); }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メンバーを削除</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget}を削除しますか？この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { setDeleteTarget(null); toast({ title: 'メンバーを削除しました' }); }}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default SettingsTeam;
