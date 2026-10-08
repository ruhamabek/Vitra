import { Clock, RotateCw, SlidersHorizontal } from 'lucide-react';
import { GitCommitSummary } from '../types.js';

export interface GitTimelinePanelProps {
  isOpen: boolean;
  gitCommits: GitCommitSummary[];
  gitHeadIndex: number;
  gitSliderIndex: number;
  isTimeTraveling: boolean;
  onClose: () => void;
  onRestoreHead: () => void;
  onSelectCommit: (index: number) => void;
}

export function GitTimelinePanel({
  isOpen,
  gitCommits,
  gitHeadIndex,
  gitSliderIndex,
  isTimeTraveling,
  onClose,
  onRestoreHead,
  onSelectCommit,
}: GitTimelinePanelProps) {
  if (!isOpen || gitCommits.length === 0) return null;

  const currentCommit =
    gitSliderIndex >= 0 && gitSliderIndex < gitCommits.length
      ? gitCommits[gitSliderIndex]
      : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-44 bg-sidebar border-t border-sidebar-border z-30 flex flex-col px-5 py-3 gap-2.5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          <span className="text-sidebar-foreground text-xs font-semibold">Commit Timeline</span>
          {isTimeTraveling && (
            <span className="bg-destructive/10 border border-destructive/40 rounded px-2 py-0.5 text-[10px] text-destructive font-medium">
              ⏸ Time Travel Mode — Read Only
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {isTimeTraveling && (
            <button
              onClick={onRestoreHead}
              className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-2.5 py-1 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 cursor-pointer transition-colors"
            >
              <RotateCw size={12} />
              Restore HEAD
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>
      </div>

       <div className="flex items-center gap-3">
        <SlidersHorizontal size={14} className="text-muted-foreground shrink-0" />
        <input
          type="range"
          min={0}
          max={gitCommits.length - 1}
          value={gitSliderIndex === -1 ? gitCommits.length - 1 : gitSliderIndex}
          onChange={(e) => onSelectCommit(parseInt(e.target.value))}
          className="flex-1 accent-primary cursor-pointer"
        />
        <span className="text-muted-foreground text-xs min-w-20 text-right font-mono">
          {gitSliderIndex === -1 || gitSliderIndex === gitHeadIndex || gitSliderIndex >= gitCommits.length
            ? 'HEAD'
            : `${gitSliderIndex + 1} / ${gitCommits.length}`}
        </span>
      </div>

       {currentCommit && (
        <div className="flex gap-3 items-center bg-card border border-border rounded-md px-3 py-2 text-xs">
          <code className="text-primary text-[11px] font-mono">
            {currentCommit.hash.slice(0, 8)}
          </code>
          <span className="text-card-foreground flex-1 font-medium truncate">{currentCommit.message}</span>
          <span className="text-muted-foreground text-xs shrink-0">{currentCommit.author}</span>
          <span className="text-muted-foreground text-xs shrink-0">
            {new Date(currentCommit.timestamp).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
