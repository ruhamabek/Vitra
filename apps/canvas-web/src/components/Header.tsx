import { useRef } from 'react';
import {
  GitBranch,
  Clock,
  Upload,
  FileDiff,
  RotateCcw,
  Code,
  Download,
  Layers,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';

export interface GitToolbarProps {
  branches: string[];
  currentBranch: string;
  commitsCount: number;
  isPanelOpen: boolean;
  onCheckoutBranch: (branch: string) => void;
  onTogglePanel: () => void;
  onRequestDiff: () => void;
  onImportFigma: (json: string, fileName: string) => void;
  onImportPenpot: (json: string, fileName: string) => void;
}

export interface CanvasActionsProps {
  onResetZoom: () => void;
  onOpenCodeModal: () => void;
  onExportVitra: () => void;
}

export interface StatusIndicatorsProps {
  isLayersOpen: boolean;
  onToggleLayers: () => void;
  totalLayersCount: number;
  isActivityOpen: boolean;
  onToggleActivity: () => void;
  activityEventsCount: number;
  connected: boolean;
  activePort: string;
  onChangePort: () => void;
}

export interface HeaderProps {
  git: GitToolbarProps;
  canvas: CanvasActionsProps;
  status: StatusIndicatorsProps;
}

function HeaderBrand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/icon-transparent.png"
        alt="Vitra Logo"
        className="w-5 h-5 object-contain shrink-0"
      />
      <span className="font-bold text-base tracking-tight text-foreground">
        Vitra Canvas
      </span>
      <span className="text-xs text-muted-foreground border-l border-sidebar-border pl-3">
        Spatial Agent Workbench
      </span>
    </div>
  );
}

function GitToolbar({
  branches,
  currentBranch,
  commitsCount,
  isPanelOpen,
  onCheckoutBranch,
  onTogglePanel,
  onRequestDiff,
  onImportFigma,
  onImportPenpot,
}: GitToolbarProps) {
  const figmaImportRef = useRef<HTMLInputElement | null>(null);
  const penpotImportRef = useRef<HTMLInputElement | null>(null);

  const handleFileLoad = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoad: (json: string, name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onLoad(reader.result as string, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-1.5">
       {branches.length > 0 && (
        <div className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-md px-2 py-1 border border-sidebar-border text-xs">
          <GitBranch size={12} className="text-emerald-400 shrink-0" />
          <select
            value={currentBranch}
            onChange={(e) => onCheckoutBranch(e.target.value)}
            className="bg-transparent border-none text-foreground text-xs cursor-pointer outline-none"
          >
            {branches.map((b) => (
              <option key={b} value={b} className="bg-popover text-popover-foreground">
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

       {commitsCount > 0 && (
        <button
          onClick={onTogglePanel}
          title="Open commit timeline"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors border ${
            isPanelOpen
              ? 'bg-accent text-accent-foreground border-primary'
              : 'bg-secondary text-secondary-foreground hover:bg-accent border-sidebar-border'
          }`}
        >
          <Clock size={12} className="text-primary" />
          <span>{commitsCount} commits</span>
        </button>
      )}

      {/* Import Figma button */}
      <button
        onClick={() => figmaImportRef.current?.click()}
        title="Import Figma JSON file"
        className="flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-accent border border-sidebar-border rounded-md px-2 py-1 text-xs cursor-pointer transition-colors"
      >
        <Upload size={12} className="text-primary" />
        <span>Import Figma</span>
      </button>
      <input
        ref={figmaImportRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => handleFileLoad(e, onImportFigma)}
      />

       <button
        onClick={() => penpotImportRef.current?.click()}
        title="Import Penpot JSON file"
        className="flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-accent border border-sidebar-border rounded-md px-2 py-1 text-xs cursor-pointer transition-colors"
      >
        <Upload size={12} className="text-emerald-400" />
        <span>Import Penpot</span>
      </button>
      <input
        ref={penpotImportRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => handleFileLoad(e, onImportPenpot)}
      />

       {commitsCount > 0 && (
        <button
          onClick={onRequestDiff}
          title="Show diff vs HEAD"
          className="flex items-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-accent border border-sidebar-border rounded-md px-2 py-1 text-xs cursor-pointer transition-colors"
        >
          <FileDiff size={12} className="text-pink-400" />
          <span>Diff</span>
        </button>
      )}
    </div>
  );
}

function CanvasActions({
  onResetZoom,
  onOpenCodeModal,
  onExportVitra,
}: CanvasActionsProps) {
  return (
    <div className="flex items-center gap-2 bg-secondary/80 border border-sidebar-border px-2 py-1 rounded-lg">
      <button
        onClick={onResetZoom}
        className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center gap-1 text-xs transition-colors"
      >
        <RotateCcw size={14} />
        <span>Reset View</span>
      </button>
      <div className="w-px h-4 bg-sidebar-border mx-1" />
      <button
        onClick={onOpenCodeModal}
        className="bg-card text-card-foreground hover:bg-accent border border-border rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
      >
        <Code size={14} className="text-primary" />
        <span>Export Code</span>
      </button>
      <button
        onClick={onExportVitra}
        title="Download .vitra project bundle"
        className="bg-card text-card-foreground hover:bg-accent border border-border rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
      >
        <Download size={14} className="text-emerald-400" />
        <span>Export .vitra</span>
      </button>
    </div>
  );
}

function StatusIndicators({
  isLayersOpen,
  onToggleLayers,
  totalLayersCount,
  isActivityOpen,
  onToggleActivity,
  activityEventsCount,
  connected,
  activePort,
  onChangePort,
}: StatusIndicatorsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggleLayers}
        title="Toggle Layers Panel"
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md cursor-pointer transition-colors border ${
          isLayersOpen
            ? 'bg-accent text-foreground border-primary'
            : 'bg-secondary text-muted-foreground hover:text-foreground border-sidebar-border'
        }`}
      >
        <Layers size={14} className="text-primary" />
        <span>
          {totalLayersCount} {totalLayersCount === 1 ? 'Layer' : 'Layers'}
        </span>
      </button>
      <button
        onClick={onToggleActivity}
        title="Toggle Activity & Sync Log Sidebar"
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md cursor-pointer transition-colors border ${
          isActivityOpen
            ? 'bg-accent text-foreground border-emerald-400'
            : 'bg-secondary text-muted-foreground hover:text-foreground border-sidebar-border'
        }`}
      >
        <Activity size={14} className="text-emerald-400" />
        <span>Activity ({activityEventsCount})</span>
      </button>
      <button
        onClick={onChangePort}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md cursor-pointer transition-colors border bg-secondary ${
          connected
            ? 'text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
            : 'text-destructive border-destructive/30 hover:border-destructive/60'
        }`}
        title={
          connected
            ? `Connected to ws://localhost:${activePort} (Click to change port)`
            : `Disconnected from ws://localhost:${activePort} (Click to change port / retry)`
        }
      >
        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span>{connected ? `Live Sync :${activePort}` : `Disconnected (:${activePort})`}</span>
      </button>
    </div>
  );
}

export function Header({ git, canvas, status }: HeaderProps) {
  return (
    <header className="h-14 px-5 bg-sidebar border-b border-sidebar-border flex items-center justify-between text-sidebar-foreground z-10 shrink-0">
      <HeaderBrand />
      <GitToolbar {...git} />
      <CanvasActions {...canvas} />
      <StatusIndicators {...status} />
    </header>
  );
}
