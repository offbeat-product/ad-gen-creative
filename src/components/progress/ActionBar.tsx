import { useState } from 'react';
import {
  Pencil, ShieldCheck, UserPlus, Download, Share2, X, Check, Copy, Loader2,
  ChevronDown, ChevronUp,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { PipelineStep } from '@/pages/GenerateProgress';
import type { WizardState } from '@/data/wizard-data';
import { clients, products, projects } from '@/data/wizard-data';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface Props {
  step: PipelineStep;
  stepIndex: number;
  state: WizardState;
  pipeline: PipelineStep[];
  completedIndexes: Set<number>;
  selectedPatternId?: string;
}

const ActionBar = ({ step, stepIndex, state, pipeline, completedIndexes, selectedPatternId }: Props) => {
  const { toast } = useToast();
  const [adCheckOpen, setAdCheckOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adCheckLoading, setAdCheckLoading] = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [priority, setPriority] = useState('normal');
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [naOpen, setNaOpen] = useState(false);

  // Checklist state for AI results section
  const [includeAppeal, setIncludeAppeal] = useState(true);
  const [includeCopy, setIncludeCopy] = useState(true);
  const [includeStoryboard, setIncludeStoryboard] = useState(true);
  const [includeNa, setIncludeNa] = useState(true);
  const [includeTonmana, setIncludeTonmana] = useState(true);
  const [includeReference, setIncludeReference] = useState(true);

  // Checklist state for requested steps
  const [requestedSteps, setRequestedSteps] = useState<Set<string>>(new Set());

  const isText = step.stepType === 'text';
  const isAudio = step.stepType === 'audio';

  const client = clients.find(c => c.id === state.clientId);
  const product = state.clientId ? (products[state.clientId] ?? []).find(p => p.id === state.productId) : null;
  const project = state.productId ? (projects[state.productId] ?? []).find(p => p.id === state.projectId) : null;
  const typeLabel = state.creativeType === 'video' ? `動画${state.videoDuration}秒` : '静止画バナー';
  const patternLabel = state.productionPattern === 'new' ? '新規制作' : 'パターン展開';
  const currentPatternId = selectedPatternId || 'A1';

  // Determine which pipeline steps are available for requesting
  const getRequestableSteps = () => {
    if (state.creativeType === 'video') {
      return [
        { id: 'style-frame', label: 'スタイルフレーム作成' },
        { id: 'storyboard', label: '絵コンテ作成' },
        { id: 'horizontal-video', label: '横動画作成' },
        { id: 'vertical-video', label: '縦動画・リサイズ' },
        { id: 'other', label: 'その他' },
      ];
    }
    return [
      { id: 'tonmana', label: 'トンマナ作成' },
      { id: 'banner', label: '静止画バナー作成' },
      { id: 'other', label: 'その他' },
    ];
  };

  const toggleRequestedStep = (id: string) => {
    setRequestedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Check which text steps are completed
  const isStepCompleted = (label: string) => {
    return pipeline.some((s, i) => s.label === label && completedIndexes.has(i));
  };

  const appealCompleted = isStepCompleted('訴求軸作成');
  const copyCompleted = isStepCompleted('コピー作成');
  const storyboardCompleted = state.creativeType === 'video'
    ? isStepCompleted('構成案・字コンテ作成')
    : isStepCompleted('構成案作成');
  const naCompleted = isStepCompleted('NA原稿作成');
  const tonmanaCompleted = state.creativeType === 'video'
    ? isStepCompleted('スタイルフレーム作成')
    : isStepCompleted('トンマナ作成');

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
    setCreatorLoading(true);
    setTimeout(() => {
      setCreatorLoading(false);
      setCreatorOpen(false);
      toast({ title: '制作依頼を送信しました。Off Beatチームが確認後、担当者からご連絡します。' });
    }, 2000);
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
        {!isAudio && (
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAdCheckOpen(true)}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />Ad Checkに送信
          </Button>
        )}
        {!isAudio && (
          <Button variant="outline" size="sm" onClick={() => setCreatorOpen(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />プロに依頼
          </Button>
        )}
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

      {/* Pro Request Modal (auto orientation sheet) */}
      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent className="max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-secondary" />
              プロに制作依頼
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Off Beatのプロクリエイターが制作します。以下のオリエン内容を確認して送信してください。
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Section 1: Project info (auto, read-only) */}
            <div>
              <h4 className="text-sm font-semibold mb-2">案件情報</h4>
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">クライアント</span>
                  <span className="font-medium">{client?.name ?? '—'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">商材</span>
                  <span className="font-medium">{product?.name ?? '—'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">案件</span>
                  <span className="font-medium">{project?.name ?? '—'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">クリエイティブタイプ</span>
                  <span className="font-medium">{typeLabel}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">制作パターン</span>
                  <span className="font-medium">{patternLabel}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">対象パターン</span>
                  <span className="font-medium">{currentPatternId}</span>
                </div>
              </div>
            </div>

            {/* Section 2: AI generation results (auto, with checkboxes) */}
            <div>
              <h4 className="text-sm font-semibold mb-2">AI生成結果</h4>
              <div className="space-y-3">
                {appealCompleted && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Checkbox
                      id="inc-appeal"
                      checked={includeAppeal}
                      onCheckedChange={(v) => setIncludeAppeal(!!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="inc-appeal" className="text-sm font-medium cursor-pointer">訴求軸</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">「未経験からエンジニア転職を実現」</p>
                    </div>
                  </div>
                )}

                {copyCompleted && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Checkbox
                      id="inc-copy"
                      checked={includeCopy}
                      onCheckedChange={(v) => setIncludeCopy(!!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="inc-copy" className="text-sm font-medium cursor-pointer">コピー</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">「未経験でも大丈夫。あなたの"好き"がキャリアになる。」</p>
                    </div>
                  </div>
                )}

                {storyboardCompleted && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Checkbox
                      id="inc-storyboard"
                      checked={includeStoryboard}
                      onCheckedChange={(v) => setIncludeStoryboard(!!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Collapsible open={storyboardOpen} onOpenChange={setStoryboardOpen}>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="inc-storyboard" className="text-sm font-medium cursor-pointer">
                            構成案（冒頭/前半/後半/締め）
                          </Label>
                          <CollapsibleTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                              {storyboardOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground bg-muted rounded p-2">
                            <p><span className="font-medium">【冒頭】</span> あなたは今、この仕事に満足していますか？</p>
                            <p><span className="font-medium">【前半】</span> 実は、未経験から転職した人の多くが同じ悩みを持っていました</p>
                            <p><span className="font-medium">【後半】</span> LevTech Rookieなら、最短3ヶ月でIT業界デビュー</p>
                            <p><span className="font-medium">【締め】</span> 今すぐ無料カウンセリングを予約</p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                )}

                {naCompleted && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Checkbox
                      id="inc-na"
                      checked={includeNa}
                      onCheckedChange={(v) => setIncludeNa(!!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Collapsible open={naOpen} onOpenChange={setNaOpen}>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="inc-na" className="text-sm font-medium cursor-pointer">NA原稿</Label>
                          <CollapsibleTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                              {naOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2 space-y-1">
                            <p>(0:00-0:05) あなたは今、この仕事に満足していますか？</p>
                            <p>(0:05-0:15) 実は、未経験からエンジニアに転職した人の多くが...</p>
                            <p>(0:15-0:25) LevTech Rookieなら、最短3ヶ月でIT業界デビュー...</p>
                            <p>(0:25-0:30) 今すぐ無料カウンセリングを予約。あなたの未来が変わる。</p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                )}

                {tonmanaCompleted && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Checkbox
                      id="inc-tonmana"
                      checked={includeTonmana}
                      onCheckedChange={(v) => setIncludeTonmana(!!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="inc-tonmana" className="text-sm font-medium cursor-pointer">
                        {state.creativeType === 'video' ? 'スタイルフレーム' : 'トンマナ'}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-0.5">「クリーン・コーポレート」</p>
                    </div>
                  </div>
                )}

                {state.referenceIds.length > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Checkbox
                      id="inc-ref"
                      checked={includeReference}
                      onCheckedChange={(v) => setIncludeReference(!!v)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="inc-ref" className="text-sm font-medium cursor-pointer">参考クリエイティブ</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">{state.referenceIds.length}件選択済み</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Request details (manual input) */}
            <div>
              <h4 className="text-sm font-semibold mb-2">依頼内容</h4>
              <div className="space-y-4">
                {/* Requested steps */}
                <div className="space-y-2">
                  <Label className="text-sm">依頼する工程</Label>
                  <div className="space-y-2">
                    {getRequestableSteps().map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`req-${s.id}`}
                          checked={requestedSteps.has(s.id)}
                          onCheckedChange={() => toggleRequestedStep(s.id)}
                        />
                        <Label htmlFor={`req-${s.id}`} className="text-sm cursor-pointer">{s.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-sm">追加要望・備考</Label>
                  <Textarea
                    rows={4}
                    placeholder="修正してほしい箇所、こだわりポイント、追加の参考資料など..."
                  />
                </div>

                {/* Delivery date */}
                <div className="space-y-2">
                  <Label className="text-sm">希望納期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !deliveryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {deliveryDate ? format(deliveryDate, 'yyyy/MM/dd') : '日付を選択'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deliveryDate}
                        onSelect={setDeliveryDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-sm">優先度</Label>
                  <RadioGroup value={priority} onValueChange={setPriority}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="normal" id="pri-normal" />
                      <Label htmlFor="pri-normal" className="text-sm cursor-pointer">通常（5営業日）</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="urgent" id="pri-urgent" />
                      <Label htmlFor="pri-urgent" className="text-sm cursor-pointer">急ぎ（3営業日）</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="express" id="pri-express" />
                      <Label htmlFor="pri-express" className="text-sm cursor-pointer">特急（1〜2営業日）</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">キャンセル</Button>
            </DialogClose>
            <Button
              onClick={handleCreatorSubmit}
              disabled={creatorLoading}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              size="lg"
            >
              {creatorLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Off Beatに依頼する
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
