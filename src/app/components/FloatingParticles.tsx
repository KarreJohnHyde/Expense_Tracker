/**
 * FloatingParticles.tsx — Advanced 3D animated floating particle background
 *
 * Renders animated orbs that float with smooth sinusoidal motion
 * behind content for a premium, depth-rich aesthetic.
 */
import { motion } from 'motion/react';
import { useMemo } from 'react';

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

export function FloatingParticles({ count = 6, className = '' }: FloatingParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: 80 + Math.random() * 200,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 5,
      hue: [160, 180, 200, 260, 300, 340][i % 6],
      opacity: 0.04 + Math.random() * 0.06,
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ zIndex: 0 }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `radial-gradient(circle, hsla(${p.hue}, 80%, 60%, ${p.opacity}) 0%, transparent 70%)`,
            filter: `blur(${40 + p.size * 0.2}px)`,
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.15, 0.9, 1.05, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
