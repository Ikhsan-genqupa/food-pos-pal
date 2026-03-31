import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const SoundToggleButton: React.FC = () => {
  const { isSoundEnabled, toggleSound } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleSound}
      className={cn(
        "flex items-center gap-2 h-9 px-3 rounded-full transition-all duration-300 border-2",
        isSoundEnabled 
          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800" 
          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
      )}
    >
      {isSoundEnabled ? (
        <>
          <Volume2 className="h-4 w-4 animate-pulse" />
          <span className="text-xs font-bold hidden md:inline">Notifikasi Suara Aktif</span>
        </>
      ) : (
        <>
          <VolumeX className="h-4 w-4" />
          <span className="text-xs font-bold hidden md:inline">Aktifkan Suara Notifikasi</span>
        </>
      )}
    </Button>
  );
};
