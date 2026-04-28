import { cn } from './ui/utils';

interface AnimatedBackdropProps {
  variant?: 'app' | 'login';
  className?: string;
}

export function AnimatedBackdrop({ variant = 'app', className }: AnimatedBackdropProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animated-backdrop',
        variant === 'login' ? 'animated-backdrop--login' : 'animated-backdrop--app',
        className,
      )}
    >
      <div className="animated-backdrop__gradient" />
      <div className="animated-backdrop__mesh" />
      <div className="animated-backdrop__blob animated-backdrop__blob--a" />
      <div className="animated-backdrop__blob animated-backdrop__blob--b" />
      <div className="animated-backdrop__blob animated-backdrop__blob--c" />
      <div className="animated-backdrop__vignette" />
    </div>
  );
}

