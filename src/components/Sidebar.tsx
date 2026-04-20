import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  Settings,
  X,
  ExternalLink,
  Infinity,
  Target,
  Layout,
  FileText,
  Mic,
  Image as ImageIcon,
  Film,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const dashboardItem = { to: '/', icon: LayoutDashboard, label: 'ダッシュボード' };

interface ToolItem {
  to: string;
  icon: typeof Target;
  label: string;
  comingSoon?: boolean;
}

const toolGroups: { emoji: string; label: string; items: ToolItem[] }[] = [
  {
    emoji: '📝',
    label: '文字生成',
    items: [
      { to: '/tools/appeal-axis', icon: Target, label: '訴求軸・コピー生成' },
      { to: '/tools/composition', icon: Layout, label: '構成案・字コンテ生成' },
      { to: '/tools/narration-script', icon: FileText, label: 'NA原稿生成' },
    ],
  },
  {
    emoji: '🔊',
    label: '音声生成',
    items: [
      { to: '/tools/narration-audio', icon: Mic, label: 'ナレーション音声生成' },
    ],
  },
  {
    emoji: '🖼️',
    label: '画像生成',
    items: [
      { to: '/tools/image-generation', icon: ImageIcon, label: '絵コンテ用画像生成' },
      { to: '/tools/banner-image', icon: ImageIcon, label: 'バナー画像生成', comingSoon: true },
    ],
  },
  {
    emoji: '🎬',
    label: '動画生成',
    items: [
      { to: '/tools/carousel-video', icon: Film, label: 'カルーセル動画生成', comingSoon: true },
      { to: '/tools/video-resize', icon: Maximize2, label: '動画リサイズ', comingSoon: true },
    ],
  },
];

const otherItems = [
  { to: '/history', icon: History, label: '履歴' },
  { to: '/settings', icon: Settings, label: '設定' },
];

const productLinks = [
  { label: 'AdLoop', url: 'https://adloop-portal.lovable.app/', active: true, color: 'text-violet-500' },
  { label: 'Ad Brain', url: 'https://ad-brain.lovable.app/', active: true, color: 'text-sky-500' },
  { label: 'Ad Check', url: 'https://ad-check.lovable.app/', active: true, color: 'text-blue-500' },
  { label: 'Ad Ops', url: null, active: false, color: 'text-gray-400' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-wash text-primary border-l-[3px] border-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  );

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
    {children}
  </p>
);

const Sidebar = ({ open, onClose }: SidebarProps) => {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-60 min-w-[240px] shrink-0 border-r bg-background transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="h-14 px-4 flex items-center border-b border-border bg-white">
          <h2 className="text-lg font-bold brand-gradient-text whitespace-nowrap">∞ Ad Gen</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="px-3 py-3 whitespace-nowrap flex-1 overflow-y-auto">
          <NavLink to={dashboardItem.to} end onClick={onClose} className={navLinkClass}>
            <dashboardItem.icon className="h-4 w-4" />
            {dashboardItem.label}
          </NavLink>

          {toolGroups.map((group, idx) => (
            <div key={group.label} className={cn(idx > 0 && 'mt-1 pt-1 border-t border-border/50')}>
              <p className="px-3 mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                <span>{group.emoji}</span>
                <span>{group.label}</span>
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) =>
                  item.comingSoon ? (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg pl-5 pr-3 py-2 text-sm font-medium transition-colors opacity-60',
                          isActive
                            ? 'bg-primary-wash text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        Soon
                      </span>
                    </NavLink>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg pl-5 pr-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-wash text-primary border-l-[3px] border-primary pl-[17px]'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  )
                )}
              </div>
            </div>
          ))}

          <SectionLabel>その他</SectionLabel>
          <div className="space-y-0.5">
            {otherItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={onClose} className={navLinkClass}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Other products */}
        <div className="px-3 pb-4">
          <Separator className="mb-3" />
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            プロダクト
          </p>
          <div className="space-y-0.5">
            {productLinks.map((p) => {
              const icon = <Infinity className={cn('h-4 w-4 shrink-0', p.color)} />;

              if (p.active && p.url) {
                return (
                  <a
                    key={p.label}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    {icon}
                    <span>{p.label}</span>
                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                  </a>
                );
              }

              return (
                <span
                  key={p.label}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40 cursor-default"
                >
                  {icon}
                  {p.label}
                  <span className="ml-auto text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
