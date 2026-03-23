export interface StyleOptions {
  colorPalette: {
    primary: string;
    secondary: string;
    background: string;
  };
  fontStyle: 'bold_gothic' | 'round_gothic' | 'mincho' | 'handwritten';
  illustrationStyle: 'flat_design' | 'line_art' | 'isometric' | 'none';
  taste: string[];
}

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
  creativeStyle: 'photographic' | 'motion_graphics' | 'hybrid' | null;
  styleOptions: StyleOptions;
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
  creativeStyle: null,
  styleOptions: {
    colorPalette: { primary: '#1E40AF', secondary: '#3B82F6', background: '#DBEAFE' },
    fontStyle: 'bold_gothic',
    illustrationStyle: 'flat_design',
    taste: [],
  },
};
