import { FileDiff } from 'lucide-react';
import { GitDiffResult } from '../types.js';

export interface GitDiffModalProps {
  isOpen: boolean;
  gitDiff: GitDiffResult | null;
  onClose: () => void;
}

export function GitDiffModal({ isOpen, gitDiff, onClose }: GitDiffModalProps) {
  if (!isOpen || !gitDiff) return null;

  const hasDiffs =
    gitDiff.added.length > 0 || gitDiff.modified.length > 0 || gitDiff.deleted.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-lg max-h-[70vh] overflow-y-auto p-6 shadow-2xl custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileDiff size={16} className="text-pink-400" />
            <span className="text-foreground text-sm font-bold">
              Visual Diff vs HEAD
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>

        {!hasDiffs ? (
          <p className="text-muted-foreground text-xs">
            No differences from HEAD. Canvas matches last commit.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {gitDiff.added.length > 0 && (
              <div>
                <div className="text-emerald-400 text-xs font-semibold mb-1.5">
                  ✚ Added ({gitDiff.added.length})
                </div>
                {gitDiff.added.map((id) => (
                  <div
                    key={id}
                    className="text-emerald-400 text-xs font-mono py-0.5"
                  >
                    {id}
                  </div>
                ))}
              </div>
            )}
            {gitDiff.modified.length > 0 && (
              <div>
                <div className="text-primary text-xs font-semibold mb-1.5">
                  ~ Modified ({gitDiff.modified.length})
                </div>
                {gitDiff.modified.map((id) => (
                  <div
                    key={id}
                    className="text-primary text-xs font-mono py-0.5"
                  >
                    {id}
                  </div>
                ))}
              </div>
            )}
            {gitDiff.deleted.length > 0 && (
              <div>
                <div className="text-destructive text-xs font-semibold mb-1.5">
                  ✕ Deleted ({gitDiff.deleted.length})
                </div>
                {gitDiff.deleted.map((id) => (
                  <div
                    key={id}
                    className="text-destructive text-xs font-mono py-0.5"
                  >
                    {id}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
