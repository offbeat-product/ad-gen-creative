import { Image, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
}

const StepType = ({ state, updateState }: Props) => {
  const types = [
    { id: 'banner' as const, icon: Image, title: '静止画バナー', sub: 'バナー広告・SNS広告用の静止画を生成' },
    { id: 'video' as const, icon: Video, title: '動画', sub: '動画広告のクリエイティブを一気通貫で生成' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight text-balance">制作するクリエイティブのタイプを選択</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => updateState({ creativeType: t.id })}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-8 h-[200px] transition-all duration-200 cursor-pointer",
              state.creativeType === t.id
                ? "border-secondary bg-secondary-wash scale-[1.01]"
                : "border-border bg-card hover:shadow-elevated hover:-translate-y-0.5"
            )}
          >
            <t.icon className={cn("h-12 w-12", state.creativeType === t.id ? "text-secondary" : "text-muted-foreground")} />
            <span className="text-lg font-semibold">{t.title}</span>
            <span className="text-sm text-muted-foreground text-center">{t.sub}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {state.creativeType === 'video' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <p className="text-sm font-medium mb-3">動画の秒数を選択</p>
              <div className="flex gap-3">
                {([15, 30, 60] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => updateState({ videoDuration: d })}
                    className={cn(
                      "rounded-xl border px-6 py-2.5 text-sm font-medium transition-all",
                      state.videoDuration === d
                        ? "border-secondary bg-secondary-wash text-secondary"
                        : "border-border bg-card hover:bg-accent"
                    )}
                  >
                    {d}秒
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StepType;
