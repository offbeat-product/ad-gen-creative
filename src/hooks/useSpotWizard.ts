import { useState, useCallback } from 'react';

/**
 * スポットツール共通のウィザードstate
 * 既存 WizardState のサブセットで、クライアント→商材→案件のみ管理
 */
export interface SpotWizardState {
  clientId: string | null;
  productId: string | null;
  projectId: string | null;
}

export const initialSpotWizardState: SpotWizardState = {
  clientId: null,
  productId: null,
  projectId: null,
};

export const useSpotWizard = () => {
  const [state, setState] = useState<SpotWizardState>(initialSpotWizardState);

  const updateState = useCallback((updates: Partial<SpotWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setState(initialSpotWizardState);
  }, []);

  return { state, updateState, reset };
};
