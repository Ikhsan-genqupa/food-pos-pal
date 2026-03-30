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
  variant?: 'default' | 'primary';
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'animate-fade-in',
        variant === 'primary' ? 'stat-card-primary' : 'stat-card',
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
                : 'text-muted-foreground'
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'text-2xl font-bold mt-1',
              variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'
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
              : 'bg-primary/10'
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              variant === 'primary' ? 'text-primary-foreground' : 'text-primary'
            )}
          />
        </div>
      </div>
    </div>
  );
}
