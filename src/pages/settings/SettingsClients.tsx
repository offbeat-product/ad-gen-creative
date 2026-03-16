import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface Project { name: string; status: string; budget: string }
interface Product { name: string; projects: Project[] }
interface Client { name: string; sub?: string; industry: string; industryClass: string; products: Product[] }

const clientsData: Client[] = [
  {
    name: 'レバレジーズ', industry: '人材・IT', industryClass: 'bg-primary-wash text-primary',
    products: [
      { name: 'LevTech Rookie', projects: [
        { name: 'EXPO 2026春', status: '進行中', budget: '¥3,000,000' },
        { name: '夏インターン集客', status: '準備中', budget: '¥2,000,000' },
        { name: '通年リクルーティング', status: '進行中', budget: '¥1,500,000/月' },
      ]},
      { name: 'レバテックキャリア', projects: [
        { name: '年収UP訴求', status: '進行中', budget: '¥2,500,000' },
        { name: 'ミドル層向け', status: '準備中', budget: '¥1,800,000' },
      ]},
      { name: 'ハタラクティブ', projects: [
        { name: '未経験者訴求', status: '進行中', budget: '¥2,000,000' },
      ]},
    ],
  },
  {
    name: 'Belmis', sub: 'アクシスイノベーション', industry: 'D2C・美容', industryClass: 'bg-secondary-wash text-secondary',
    products: [
      { name: '着圧レギンス', projects: [
        { name: '春キャンペーン', status: '進行中', budget: '¥1,500,000' },
        { name: 'インスタ施策', status: '完了', budget: '¥800,000' },
      ]},
    ],
  },
  {
    name: 'コミックシーモア', industry: 'エンタメ', industryClass: 'bg-success-wash text-success',
    products: [
      { name: 'コミックシーモア', projects: [
        { name: '新刊プロモ', status: '進行中', budget: '¥1,200,000' },
        { name: '週末限定セール', status: '完了', budget: '¥600,000' },
      ]},
    ],
  },
  {
    name: 'TMD AGA', industry: '医療', industryClass: 'bg-warning-wash text-warning',
    products: [
      { name: 'AGA治療', projects: [
        { name: '春の抜け毛対策', status: '進行中', budget: '¥2,000,000' },
        { name: 'リスティング素材', status: '完了', budget: '¥1,000,000' },
      ]},
      { name: 'FAGA治療', projects: [
        { name: '女性向け訴求', status: '進行中', budget: '¥1,500,000' },
      ]},
    ],
  },
];

const statusClass: Record<string, string> = {
  '進行中': 'bg-success-wash text-success',
  '準備中': 'bg-warning-wash text-warning',
  '完了': 'bg-muted text-muted-foreground',
  '一時停止': 'bg-destructive/10 text-destructive',
};

const SettingsClients = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>('レバレジーズ');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'client' | 'product' | 'project' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = clientsData.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setModalType('client')}>
          <Plus className="h-3.5 w-3.5 mr-1" />新しいクライアントを追加
        </Button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="クライアント名で検索..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
      </div>

      {/* Client accordions */}
      <div className="space-y-2">
        {filtered.map(client => (
          <Collapsible key={client.name} open={expandedClient === client.name} onOpenChange={() => setExpandedClient(expandedClient === client.name ? null : client.name)}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
              {expandedClient === client.name ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="font-semibold">{client.name}</span>
              {client.sub && <span className="text-xs text-muted-foreground">（{client.sub}）</span>}
              <Badge className={cn('text-xs', client.industryClass)}>{client.industry}</Badge>
              <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModalType('client')}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(client.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="pl-8 pr-4 py-3 space-y-2">
                {client.products.map(product => (
                  <Collapsible key={product.name} open={expandedProduct === product.name} onOpenChange={() => setExpandedProduct(expandedProduct === product.name ? null : product.name)}>
                    <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors text-sm">
                      {expandedProduct === product.name ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">案件数: {product.projects.length}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-6 py-2 space-y-1.5">
                        {product.projects.map(proj => (
                          <div key={proj.name} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-accent/20">
                            <span>{proj.name}</span>
                            <Badge className={cn('text-xs', statusClass[proj.status])}>{proj.status}</Badge>
                            <span className="text-xs text-muted-foreground ml-auto">{proj.budget}</span>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="text-xs text-secondary" onClick={() => setModalType('project')}>
                          <Plus className="h-3 w-3 mr-1" />案件を追加
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                <Button variant="ghost" size="sm" className="text-xs text-secondary" onClick={() => setModalType('product')}>
                  <Plus className="h-3 w-3 mr-1" />商材を追加
                </Button>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Add/Edit Client Modal */}
      <Dialog open={modalType === 'client'} onOpenChange={() => setModalType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>クライアント追加</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>クライアント名 *</Label><Input placeholder="会社名を入力" /></div>
            <div className="space-y-1.5">
              <Label>業種</Label>
              <Select defaultValue="人材・IT">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['人材・IT', 'D2C・美容', 'エンタメ', '医療', '金融', '不動産', 'その他'].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>備考</Label><Textarea placeholder="メモを入力..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={() => { setModalType(null); toast({ title: 'クライアントを保存しました' }); }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={modalType === 'product'} onOpenChange={() => setModalType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>商材追加</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>商材名 *</Label><Input placeholder="商材名を入力" /></div>
            <div className="space-y-1.5"><Label>説明</Label><Input placeholder="商材の説明" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={() => { setModalType(null); toast({ title: '商材を保存しました' }); }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Project Modal */}
      <Dialog open={modalType === 'project'} onOpenChange={() => setModalType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>案件追加</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>案件名 *</Label><Input placeholder="案件名を入力" /></div>
            <div className="space-y-1.5">
              <Label>期間</Label>
              <div className="flex items-center gap-2">
                <Input type="date" className="flex-1" />
                <span className="text-muted-foreground text-sm">〜</span>
                <Input type="date" className="flex-1" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox id="yearly" /><Label htmlFor="yearly" className="text-xs">通年</Label>
              </div>
            </div>
            <div className="space-y-1.5"><Label>予算（円）</Label><Input type="number" placeholder="3000000" /></div>
            <div className="space-y-1.5">
              <Label>ステータス</Label>
              <Select defaultValue="準備中">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['準備中', '進行中', '完了', '一時停止'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalType(null)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={() => { setModalType(null); toast({ title: '案件を保存しました' }); }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget}を削除しますか？この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { setDeleteTarget(null); toast({ title: `${deleteTarget}を削除しました` }); }}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default SettingsClients;
