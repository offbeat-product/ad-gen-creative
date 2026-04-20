import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface CurrentProjectContextType {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  clearProject: () => void;
}

const CurrentProjectContext = createContext<CurrentProjectContextType>({
  currentProjectId: null,
  setCurrentProjectId: () => {},
  clearProject: () => {},
});

export const useCurrentProject = () => useContext(CurrentProjectContext);

export const CurrentProjectProvider = ({ children }: { children: ReactNode }) => {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const clearProject = useCallback(() => setCurrentProjectId(null), []);

  return (
    <CurrentProjectContext.Provider value={{ currentProjectId, setCurrentProjectId, clearProject }}>
      {children}
    </CurrentProjectContext.Provider>
  );
};
