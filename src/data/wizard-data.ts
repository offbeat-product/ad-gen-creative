export interface WizardState {
  creativeType: 'banner' | 'video' | null;
  videoDuration: 15 | 30 | 60;
  clientId: string | null;
  productId: string | null;
  projectId: string | null;
  referenceIds: string[];
  referenceFileNames: Record<string, string>;
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
  referenceFileNames: {},
  referenceUrls: [],
  productionPattern: null,
  baseCreativeId: null,
  productionCount: 6,
  appealAxis: 3,
  copyPatterns: 3,
  tonePatterns: 2,
  generationMode: 'auto',
};

