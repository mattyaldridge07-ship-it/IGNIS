import type React from 'react';
import { cn } from '../../lib/cn';

interface PanelProps {
  title: string;
  icon?: React.ReactNode;
  accent?: 'cyan' | 'orange';
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function Panel({ title, icon, accent = 'cyan', className, children, action }: PanelProps) {
  return (
    <div className={cn('panel-edge rounded-lg bg-ignis-panel/80 backdrop-blur-sm', className)}>
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ignis-border">
        <div className="flex items-center gap-2">
          {icon && (
            <span className={accent === 'cyan' ? 'text-ignis-cyan' : 'text-ignis-orange'}>{icon}</span>
          )}
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}
