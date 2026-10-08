import { Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { ActivityEvent } from '../types.js';

export interface ActivitySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  events: ActivityEvent[];
}

export function ActivitySidebar({ isOpen, onToggle, events }: ActivitySidebarProps) {
  if (!isOpen) {
    return (
      <aside
        className="w-9 min-w-9 max-w-9 bg-sidebar border-l border-sidebar-border flex flex-col items-center pt-3 z-20 cursor-pointer select-none transition-all duration-150 shrink-0"
        onClick={onToggle}
        title="Expand Activity & Sync Log"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title="Expand Activity & Sync Log"
          className="bg-secondary text-emerald-400 hover:text-emerald-300 border border-sidebar-border rounded-md w-6.5 h-6.5 flex items-center justify-center cursor-pointer mb-4"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold tracking-wider text-muted-foreground flex items-center gap-2">
          <Activity size={13} className="text-emerald-400" />
          <span>ACTIVITY ({events.length})</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-96 min-w-96 max-w-96 bg-sidebar border-l border-sidebar-border flex flex-col overflow-hidden z-20 transition-all duration-150 shrink-0">
       <div className="px-3.5 py-3 border-b border-sidebar-border flex items-center justify-between bg-sidebar/50">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-emerald-400" />
          <span className="text-xs font-semibold text-sidebar-foreground">
            Activity & Sync Log ({events.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">CLI & MCP Sync</span>
          <button
            onClick={onToggle}
            title="Collapse Sidebar"
            className="bg-secondary text-muted-foreground hover:text-foreground border border-sidebar-border cursor-pointer p-1 rounded-md flex items-center justify-center transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

       <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
        {events.length === 0 ? (
          <div className="py-6 px-3 text-center text-muted-foreground text-xs">
            No events yet. Changes made by CLI agents or Penpot will appear here in real-time.
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="bg-card border border-border border-l-2 border-l-primary rounded-md p-2.5 text-xs shadow-xs"
            >
              <div className="text-card-foreground leading-relaxed">{ev.text}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{ev.time}</div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
