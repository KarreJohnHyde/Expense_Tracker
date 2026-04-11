/**
 * TiltCard.tsx — Advanced 3D perspective tilt card component
 *
 * Wraps any child element in a 3D-perspective container that responds to
 * mouse movement with smooth, physics-based tilt along the X and Y axes,
 * and a dynamic gloss/highlight that follows the cursor position.
 */
import { useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt angle in degrees (default 12) */
  tiltMax?: number;
  /** Spring stiffness (higher = snappier) */
  stiffness?: number;
  /** Spring damping (higher = less bounce) */
  damping?: number;
  /** Whether to show the gloss highlight overlay */
  gloss?: boolean;
  /** Scale factor on hover (default 1.02) */
  hoverScale?: number;
}

export function TiltCard({
  children,
  className = '',
  tiltMax = 12,
  stiffness = 260,
  damping = 20,
  gloss = true,
  hoverScale = 1.02,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse values (normalised -0.5 → 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring-powered rotations
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [tiltMax, -tiltMax]), {
    stiffness,
    damping,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-tiltMax, tiltMax]), {
    stiffness,
    damping,
  });

  // Gloss highlight position
  const glossX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%']);
  const glossY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 800,
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
      }}
      animate={{ scale: isHovered ? hoverScale : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative ${className}`}
    >
      {children}

      {/* Gloss overlay */}
      {gloss && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
          style={{
            background: `radial-gradient(circle at ${glossX as any} ${glossY as any}, rgba(255,255,255,0.12) 0%, transparent 60%)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
      )}
    </motion.div>
  );
}
