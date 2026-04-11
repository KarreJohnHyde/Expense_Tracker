import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from './ui/utils';

interface LiveTimeProps {
  className?: string;
  showIcon?: boolean;
}

export function LiveTime({ className, showIcon = true }: LiveTimeProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format: 10:21:02 AM
  const timeString = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Format: Friday, April 10
  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn("flex flex-col items-center justify-center py-2 px-3 rounded-xl glass border border-primary/20", className)}>
      <div className="flex items-center gap-2">
        {showIcon && <Clock className="size-3.5 text-primary animate-pulse" />}
        <span className="text-sm font-bold tracking-tight font-mono tabular-nums text-foreground">
          {timeString}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-0.5">
        {dateString} • Universal Time
      </span>
    </div>
  );
}
