import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardCompactProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
  className?: string;
}

export default function StatCardCompact({
  title,
  value,
  icon: Icon,
  color = 'text-primary',
  className,
}: StatCardCompactProps) {
  return (
    <div className={cn(
      "bg-white border border-slate-100 rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all",
      className
    )}>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className={cn("h-3.5 w-3.5 opacity-70", color)} />}
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {title}
        </p>
      </div>
      <p className={cn("text-lg font-black tracking-tight", color)}>
        {value}
      </p>
    </div>
  );
}
