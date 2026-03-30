import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'warning';
  className?: string;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'animate-fade-in transition-all',
        onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        variant === 'primary' ? 'stat-card-primary' : 
        variant === 'warning' ? 'bg-amber-50 border border-amber-200' : 
        'stat-card',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={cn(
              'text-sm font-medium',
              variant === 'primary'
                ? 'text-primary-foreground/80'
                : variant === 'warning'
                ? 'text-amber-700'
                : 'text-muted-foreground'
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'text-2xl font-bold mt-1',
              variant === 'primary' 
                ? 'text-primary-foreground' 
                : variant === 'warning'
                ? 'text-amber-900'
                : 'text-foreground'
            )}
          >
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'text-xs mt-2 font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% dari kemarin
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-xl',
            variant === 'primary'
              ? 'bg-primary-foreground/20'
              : variant === 'warning'
              ? 'bg-amber-200/50'
              : 'bg-primary/10'
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              variant === 'primary' 
                ? 'text-primary-foreground' 
                : variant === 'warning'
                ? 'text-amber-700'
                : 'text-primary'
            )}
          />
        </div>
      </div>
    </div>
  );
}
