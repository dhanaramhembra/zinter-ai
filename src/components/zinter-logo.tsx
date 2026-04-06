'use client';

import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'icon';
type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface ZinterLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  animated?: boolean;
  glowOnHover?: boolean;
}

const SIZE_MAP: Record<LogoSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 64,
  xxl: 80,
};

/**
 * Premium Zinter AI Logo — custom SVG lettermark
 *
 * Variants:
 *  - "full"  → rounded-square gradient container + white Z + sparkle accent
 *  - "icon"  → just the Z symbol (no container), for tight spaces
 */
export function ZinterLogo({
  variant = 'full',
  size = 'md',
  className,
  animated = false,
  glowOnHover = false,
}: ZinterLogoProps) {
  const s = SIZE_MAP[size];

  if (variant === 'icon') {
    return (
      <div
        className={cn(
          'relative inline-flex items-center justify-center shrink-0',
          glowOnHover && 'transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
          className
        )}
        style={{ width: s, height: s }}
      >
        <ZinterMark size={s} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0',
        glowOnHover && 'transition-all duration-300 hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]',
        className
      )}
      style={{ width: s, height: s }}
    >
      <svg
        viewBox="0 0 100 100"
        width={s}
        height={s}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <defs>
          {/* Container gradient */}
          <linearGradient id="zContainerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>

          {/* Inner highlight gradient (top-left sheen) */}
          <linearGradient id="zSheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
          </linearGradient>

          {/* Z mark gradient */}
          <linearGradient id="zMarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.92" />
          </linearGradient>

          {/* Shadow filter */}
          <filter id="zShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
          </filter>

          {/* Sparkle glow */}
          <filter id="sparkleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip for inner sheen */}
          <clipPath id="containerClip">
            <rect x="4" y="4" width="92" height="92" rx="22" />
          </clipPath>
        </defs>

        {/* Container background */}
        <rect
          x="4" y="4" width="92" height="92" rx="22"
          fill="url(#zContainerGrad)"
        />

        {/* Inner sheen overlay */}
        <rect
          x="4" y="4" width="92" height="92" rx="22"
          fill="url(#zSheenGrad)"
          clipPath="url(#containerClip)"
        />

        {/* Subtle inner border */}
        <rect
          x="4.5" y="4.5" width="91" height="91" rx="21.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.5"
          opacity="0.12"
        />

        {/* Z lettermark with shadow */}
        <g filter="url(#zShadow)">
          <ZinterMarkPath fill="url(#zMarkGrad)" />
        </g>

        {/* Sparkle accent */}
        <g filter="url(#sparkleGlow)">
          <circle cx="78" cy="20" r="3.5" fill="#ffffff" opacity="0.9" />
          <circle cx="78" cy="20" r="1.5" fill="#ffffff" />
        </g>

        {/* Tiny secondary accent dots */}
        <circle cx="22" cy="80" r="1.5" fill="#ffffff" opacity="0.25" />
        <circle cx="82" cy="72" r="1" fill="#ffffff" opacity="0.15" />
      </svg>

      {/* Animated ring (optional) */}
      {animated && (
        <style>{`
          @keyframes zinterLogoSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes zinterLogoPulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.7; }
          }
        `}</style>
      )}
    </div>
  );
}

/** The standalone Z lettermark (no container) */
function ZinterMark({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className="block"
    >
      <defs>
        <linearGradient id="zIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="zIconGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <ZinterMarkPath fill="url(#zIconGrad)" />
    </svg>
  );
}

/** The actual Z path — reusable across variants */
function ZinterMarkPath({ fill }: { fill: string }) {
  return (
    <path
      d={`
        M 32 27
        L 68 27
        Q 72 27 72 31
        L 72 33
        L 38 67
        Q 35 70 38 70
        L 68 70
        Q 72 70 72 74
        L 72 76
        L 32 76
        Q 28 76 28 72
        L 28 70
        L 62 36
        Q 65 33 62 33
        L 32 33
        Q 28 33 28 29
        L 28 27
        Z
      `}
      fill={fill}
    />
  );
}

/** Logo with rotating gradient ring animation wrapper */
export function ZinterLogoAnimated({ size = 'xl', className }: { size?: LogoSize; className?: string }) {
  const s = SIZE_MAP[size];
  const ringInset = s * 0.08;

  return (
    <div className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      {/* Outer spinning ring */}
      <div
        className="absolute rounded-[22%] opacity-50"
        style={{
          inset: -ringInset,
          background: 'conic-gradient(from 0deg, #10b981, #14b8a6, #0d9488, #10b981)',
          WebkitMask: 'radial-gradient(transparent 62%, black 64%)',
          mask: 'radial-gradient(transparent 62%, black 64%)',
          animation: 'zinterLogoSpin 4s linear infinite',
        }}
      />
      {/* Inner counter-spinning ring */}
      <div
        className="absolute rounded-[22%] opacity-30"
        style={{
          inset: -ringInset * 0.5,
          background: 'conic-gradient(from 180deg, #34d399, #2dd4bf, #34d399)',
          WebkitMask: 'radial-gradient(transparent 66%, black 68%)',
          mask: 'radial-gradient(transparent 66%, black 68%)',
          animation: 'zinterLogoSpin 6s linear infinite reverse',
        }}
      />
      {/* Pulsing glow */}
      <div
        className="absolute rounded-[22%]"
        style={{
          inset: -ringInset * 0.3,
          background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
          animation: 'zinterLogoPulse 3s ease-in-out infinite',
        }}
      />
      {/* Logo — animated=true injects the @keyframes needed for the rings */}
      <ZinterLogo variant="full" size={size} animated />
    </div>
  );
}

/** Logo + Text side by side */
export function ZinterLogoWithText({
  size = 'md',
  textSize = 'base',
  className,
}: {
  size?: LogoSize;
  textSize?: 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}) {
  const textClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[textSize];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <ZinterLogo variant="full" size={size} glowOnHover />
      <span className={cn('font-bold tracking-tight gradient-text', textClass)}>
        Zinter AI
      </span>
    </div>
  );
}
