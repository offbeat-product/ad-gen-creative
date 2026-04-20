import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'adgen.notifications';

const SettingsNotifications = () => {
  const { toast } = useToast();
  const [emailOnComplete, setEmailOnComplete] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setEmailOnComplete(parsed.email_on_complete ?? true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email_on_complete: emailOnComplete }));
    toast({ title: '通知設定を保存しました' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">メール通知</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">生成完了時のメール通知</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                各ツールの生成が完了したときにメールでお知らせします
              </p>
            </div>
            <Switch checked={emailOnComplete} onCheckedChange={setEmailOnComplete} />
          </div>
        </CardContent>
      </Card>

      <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleSave}>
        通知設定を保存
      </Button>
    </motion.div>
  );
};

export default SettingsNotifications;
