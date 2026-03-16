import { useState } from 'react';
import {
  Pencil, ShieldCheck, UserPlus, Download, Share2, X, Check, Copy, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import type { PipelineStep } from '@/pages/GenerateProgress';

interface Props {
  step: PipelineStep;
  stepIndex: number;
}

const ActionBar = ({ step }: Props) => {
  const { toast } = useToast();
  const [adCheckOpen, setAdCheckOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adCheckLoading, setAdCheckLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const isText = step.stepType === 'text';
  const isAudio = step.stepType === 'audio';

  const handleAdCheck = () => {
    setAdCheckLoading(true);
    setTimeout(() => {
      setAdCheckLoading(false);
      setAdCheckOpen(false);
      toast({
        title: 'Ad Checkに送信しました',
        description: (
          <a href="https://ad-check.lovable.app" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Ad Checkで確認する →
          </a>
        ),
      });
    }, 2000);
  };

  const handleCreatorSubmit = () => {
    setCreatorOpen(false);
    toast({ title: '制作依頼を送信しました' });
  };

  const handleDownload = () => {
    toast({ title: 'ダウンロード完了' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://adloop.app/share/abc123');
    toast({ title: 'リンクをコピーしました' });
  };

  return (
    <>
      <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
        {/* Text editing */}
        {isText && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />編集
          </Button>
        )}
        {isText && editing && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <Check className="h-3.5 w-3.5 mr-1" />保存
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5 mr-1" />キャンセル
            </Button>
          </>
        )}

        {/* Ad Check - not for audio */}
        {!isAudio && (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAdCheckOpen(true)}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />Ad Checkに送信
          </Button>
        )}

        {/* Creator request - not for audio */}
        {!isAudio && (
          <Button variant="outline" size="sm" onClick={() => setCreatorOpen(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />プロに依頼
          </Button>
        )}

        {/* Download & share - always */}
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5 mr-1" />ダウンロード
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="h-3.5 w-3.5 mr-1" />共有
        </Button>
      </div>

      {/* Ad Check Modal */}
      <Dialog open={adCheckOpen} onOpenChange={setAdCheckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Ad Checkに送信
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm">この生成物をAd Checkにアップロードして検品を行いますか？</p>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">送信対象:</span> {step.label} — {step.completedText}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="notify" defaultChecked />
              <Label htmlFor="notify" className="text-sm">検品完了後に通知を受け取る</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">キャンセル</Button>
            </DialogClose>
            <Button onClick={handleAdCheck} disabled={adCheckLoading} className="bg-primary text-primary-foreground">
              {adCheckLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              送信する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creator Request Modal */}
      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-secondary" />
              クリエイターに制作依頼
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm">AIでの自動生成が難しいため、クリエイターに制作を依頼します。</p>
            <div className="space-y-2">
              <Label className="text-sm">担当クリエイター</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tanaka">田中</SelectItem>
                  <SelectItem value="suzuki">鈴木</SelectItem>
                  <SelectItem value="sato">佐藤</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">依頼内容・備考</Label>
              <Textarea placeholder="修正してほしい箇所や追加要望を記載..." />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">希望納期</Label>
              <Input type="date" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">キャンセル</Button>
            </DialogClose>
            <Button onClick={handleCreatorSubmit} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              依頼を送信する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-6 w-6" />
              共有リンクを作成
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input readOnly value="https://adloop.app/share/abc123" className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">共有設定</Label>
              <RadioGroup defaultValue="all">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="share-all" />
                  <Label htmlFor="share-all" className="text-sm">リンクを知っている全員</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="team" id="share-team" />
                  <Label htmlFor="share-team" className="text-sm">チームメンバーのみ</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">有効期限</Label>
              <Select defaultValue="30">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7日</SelectItem>
                  <SelectItem value="30">30日</SelectItem>
                  <SelectItem value="none">無期限</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">閉じる</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActionBar;
