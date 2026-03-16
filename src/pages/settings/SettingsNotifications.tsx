import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface NotifItem { key: string; label: string; desc: string; defaultOn: boolean }

const emailNotifs: NotifItem[] = [
  { key: 'gen-done', label: '生成完了通知', desc: 'AI生成が完了した時にメールで通知', defaultOn: true },
  { key: 'adcheck', label: 'Ad Check結果通知', desc: 'Ad Checkの検品結果が出た時に通知', defaultOn: true },
  { key: 'pro-status', label: 'プロ依頼ステータス更新', desc: 'Off Beatへの制作依頼のステータスが更新された時に通知', defaultOn: true },
  { key: 'team-invite', label: 'チーム招待通知', desc: '新しいメンバーが追加された時に通知', defaultOn: true },
  { key: 'weekly', label: '週次レポート', desc: '週次の生成レポートをメールで受信', defaultOn: false },
];

const appNotifs: NotifItem[] = [
  { key: 'app-gen', label: '生成完了', desc: 'ヘッダーのベルアイコンに通知バッジを表示', defaultOn: true },
  { key: 'app-adcheck', label: 'Ad Check結果', desc: '同上', defaultOn: true },
  { key: 'app-pro', label: 'プロ依頼更新', desc: '同上', defaultOn: true },
  { key: 'app-release', label: '新機能リリース', desc: 'AdLoopの新機能情報', defaultOn: true },
];

const SettingsNotifications = () => {
  const { toast } = useToast();
  const [emailState, setEmailState] = useState<Record<string, boolean>>(
    Object.fromEntries(emailNotifs.map(n => [n.key, n.defaultOn]))
  );
  const [appState, setAppState] = useState<Record<string, boolean>>(
    Object.fromEntries(appNotifs.map(n => [n.key, n.defaultOn]))
  );

  const toggle = (section: 'email' | 'app', key: string) => {
    if (section === 'email') setEmailState(prev => ({ ...prev, [key]: !prev[key] }));
    else setAppState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">メール通知</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {emailNotifs.map(n => (
            <div key={n.key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{n.label}</Label>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch checked={emailState[n.key]} onCheckedChange={() => toggle('email', n.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">アプリ内通知</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {appNotifs.map(n => (
            <div key={n.key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{n.label}</Label>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch checked={appState[n.key]} onCheckedChange={() => toggle('app', n.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => toast({ title: '通知設定を保存しました' })}>
        通知設定を保存
      </Button>
    </motion.div>
  );
};

export default SettingsNotifications;
