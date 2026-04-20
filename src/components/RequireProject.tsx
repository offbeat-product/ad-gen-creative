import { useState, type ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentProject } from '@/contexts/CurrentProjectContext';
import ProjectSwitcherModal from './ProjectSwitcherModal';

const RequireProject = ({ children }: { children: ReactNode }) => {
  const { currentProjectId } = useCurrentProject();
  const [open, setOpen] = useState(false);

  if (!currentProjectId) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">案件を選択してください</h2>
            <p className="text-sm text-muted-foreground mt-1">
              ツールを使用するには、まず作業する案件を選択する必要があります。
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>案件を選択する</Button>
        </div>
        <ProjectSwitcherModal open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return <>{children}</>;
};

export default RequireProject;
