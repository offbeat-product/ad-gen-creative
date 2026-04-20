import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'adgen:current-project-id';

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
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const setCurrentProjectId = useCallback((id: string | null) => {
    setCurrentProjectIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearProject = useCallback(() => setCurrentProjectId(null), [setCurrentProjectId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCurrentProjectIdState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <CurrentProjectContext.Provider value={{ currentProjectId, setCurrentProjectId, clearProject }}>
      {children}
    </CurrentProjectContext.Provider>
  );
};
