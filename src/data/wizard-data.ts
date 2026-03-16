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

export const referenceCreatives = [
  { id: 'ref-1', title: '問題提起型_30秒_v3', cvr: '3.2%', best: true },
  { id: 'ref-2', title: '体験談型_30秒_v2', cvr: '2.8%', best: false },
  { id: 'ref-3', title: '権威性訴求_15秒_v1', cvr: '2.5%', best: false },
  { id: 'ref-4', title: 'Before/After_30秒_v4', cvr: '2.3%', best: false },
  { id: 'ref-5', title: '限定オファー_15秒_v2', cvr: '2.1%', best: false },
  { id: 'ref-6', title: '比較型_30秒_v1', cvr: '1.9%', best: false },
];
