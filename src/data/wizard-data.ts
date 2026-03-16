export interface WizardState {
  creativeType: 'banner' | 'video' | null;
  videoDuration: 15 | 30 | 60;
  clientId: string | null;
  productId: string | null;
  projectId: string | null;
  referenceIds: string[];
  referenceUrls: string[];
  productionPattern: 'new' | 'variation' | null;
  baseCreativeId: string | null;
  productionCount: number;
  appealAxis: number;
  copyPatterns: number;
  tonePatterns: number;
  generationMode: 'auto' | 'step';
}

export const initialWizardState: WizardState = {
  creativeType: null,
  videoDuration: 30,
  clientId: null,
  productId: null,
  projectId: null,
  referenceIds: [],
  referenceUrls: [],
  productionPattern: null,
  baseCreativeId: null,
  productionCount: 6,
  appealAxis: 3,
  copyPatterns: 3,
  tonePatterns: 2,
  generationMode: 'auto',
};

export const clients = [
  {
    id: 'leverages',
    name: 'レバレジーズ',
    industry: '人材・IT',
    industryColor: 'primary-wash' as const,
    productCount: 3,
    ruleCount: 320,
    knowledge: '15KB',
    lastUpdated: '2026/03/16',
  },
  {
    id: 'belmis',
    name: 'Belmis（アクシスイノベーション）',
    industry: 'D2C・美容',
    industryColor: 'secondary-wash' as const,
    productCount: 1,
    ruleCount: 180,
    knowledge: '8KB',
    lastUpdated: '2026/03/15',
  },
  {
    id: 'cmoa',
    name: 'コミックシーモア',
    industry: 'エンタメ',
    industryColor: 'success-wash' as const,
    productCount: 1,
    ruleCount: 250,
    knowledge: '12KB',
    lastUpdated: '2026/03/14',
  },
  {
    id: 'tmd',
    name: 'TMD AGA',
    industry: '医療',
    industryColor: 'warning-wash' as const,
    productCount: 2,
    ruleCount: 150,
    knowledge: '5KB',
    lastUpdated: '2026/03/12',
  },
];

export const products: Record<string, { id: string; name: string; desc: string; projectCount: number }[]> = {
  leverages: [
    { id: 'levtech-rookie', name: 'LevTech Rookie', desc: '新卒エンジニア向けイベント', projectCount: 3 },
    { id: 'levtech-career', name: 'レバテックキャリア', desc: 'ITエンジニア転職支援', projectCount: 2 },
    { id: 'hataractive', name: 'ハタラクティブ', desc: '未経験者向け就職支援', projectCount: 1 },
  ],
  belmis: [
    { id: 'belmis-leggings', name: 'Belmis着圧レギンス', desc: '女性向け着圧レギンス', projectCount: 2 },
  ],
  cmoa: [
    { id: 'cmoa-main', name: 'コミックシーモア', desc: '電子コミック配信サービス', projectCount: 2 },
  ],
  tmd: [
    { id: 'aga', name: 'AGA治療', desc: '男性向けAGA治療', projectCount: 2 },
    { id: 'faga', name: 'FAGA治療', desc: '女性向け薄毛治療', projectCount: 1 },
  ],
};

export const projects: Record<string, { id: string; name: string; period: string; status: string; statusColor: string; budget: string }[]> = {
  'levtech-rookie': [
    { id: 'expo-2026', name: 'EXPO 2026春', period: '2026/04/01〜04/30', status: '進行中', statusColor: 'success', budget: '¥3,000,000' },
    { id: 'summer-intern', name: '夏インターン集客', period: '2026/06/01〜07/31', status: '準備中', statusColor: 'warning', budget: '¥2,000,000' },
    { id: 'annual-recruiting', name: '通年リクルーティング', period: '通年', status: '進行中', statusColor: 'success', budget: '¥1,500,000/月' },
  ],
  'levtech-career': [
    { id: 'lc-spring', name: '春季キャンペーン', period: '2026/03/01〜05/31', status: '進行中', statusColor: 'success', budget: '¥2,500,000' },
    { id: 'lc-brand', name: 'ブランド認知', period: '通年', status: '進行中', statusColor: 'success', budget: '¥1,000,000/月' },
  ],
  hataractive: [
    { id: 'ha-new', name: '新規獲得キャンペーン', period: '2026/04/01〜06/30', status: '準備中', statusColor: 'warning', budget: '¥1,500,000' },
  ],
  'belmis-leggings': [
    { id: 'bl-summer', name: '夏季プロモーション', period: '2026/05/01〜08/31', status: '準備中', statusColor: 'warning', budget: '¥2,000,000' },
    { id: 'bl-annual', name: '通年LP広告', period: '通年', status: '進行中', statusColor: 'success', budget: '¥800,000/月' },
  ],
  'cmoa-main': [
    { id: 'cm-spring', name: '春の読書キャンペーン', period: '2026/03/15〜04/30', status: '進行中', statusColor: 'success', budget: '¥3,000,000' },
    { id: 'cm-new', name: '新規会員獲得', period: '通年', status: '進行中', statusColor: 'success', budget: '¥1,200,000/月' },
  ],
  aga: [
    { id: 'aga-spring', name: '春季集患キャンペーン', period: '2026/03/01〜05/31', status: '進行中', statusColor: 'success', budget: '¥2,000,000' },
    { id: 'aga-annual', name: '通年集患', period: '通年', status: '進行中', statusColor: 'success', budget: '¥600,000/月' },
  ],
  faga: [
    { id: 'faga-new', name: '新規開設キャンペーン', period: '2026/04/01〜06/30', status: '準備中', statusColor: 'warning', budget: '¥1,500,000' },
  ],
};

export const referenceCreatives = [
  { id: 'ref-1', title: '問題提起型_30秒_v3', cvr: '3.2%', best: true },
  { id: 'ref-2', title: '体験談型_30秒_v2', cvr: '2.8%', best: false },
  { id: 'ref-3', title: '権威性訴求_15秒_v1', cvr: '2.5%', best: false },
  { id: 'ref-4', title: 'Before/After_30秒_v4', cvr: '2.3%', best: false },
  { id: 'ref-5', title: '限定オファー_15秒_v2', cvr: '2.1%', best: false },
  { id: 'ref-6', title: '比較型_30秒_v1', cvr: '1.9%', best: false },
];
