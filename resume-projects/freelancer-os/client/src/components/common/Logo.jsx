import React from 'react';

/**
 * Floorly Brand Logo Component
 * - Cobalt rounded square (#0047AB)
 * - Clean lowercase "f": straight vertical stem + top hook, no base crossbar or curls
 * - Separate sun-yellow floor bar (#FFC72C) with a visible gap
 * - Wordmark "Floorly" in Bricolage Grotesque
 */
export function LogoIcon({
  size = 32,
  className = '',
  bgColor,
  fColor,
  floorColor = 'var(--sun, #FFC72C)',
  variant = 'default',
}) {
  // On cobalt/dark backgrounds (variant='white'), use white card with cobalt 'f' for crisp contrast
  const resolvedBg = bgColor || (variant === 'white' ? '#FFFFFF' : 'var(--cobalt, #0047AB)');
  const resolvedF = fColor || (variant === 'white' ? 'var(--cobalt, #0047AB)' : '#FFFFFF');
  const resolvedFloor = floorColor || 'var(--sun, #FFC72C)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Rounded square container */}
      <rect width="32" height="32" rx="8" fill={resolvedBg} />

      {/* Clean Lowercase 'f' (straight stem + top hook right, no base crossbar/curls) */}
      <path
        d="M20.5 8C17.5 8 15.5 10 15.5 13V22"
        fill="none"
        stroke={resolvedF}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Crossbar well above the base */}
      <path
        d="M11 13.5H19.5"
        fill="none"
        stroke={resolvedF}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Separate sun-yellow floor bar standing below with a visible gap */}
      <rect x="8" y="25.5" width="16" height="2.5" rx="1.25" fill={resolvedFloor} />
    </svg>
  );
}

export function Logo({
  size = 'md', // 'sm' | 'md' | 'lg' | number
  showText = true,
  variant = 'default', // 'default' (cobalt text) | 'white' (white text)
  className = '',
  textClassName = '',
}) {
  const sizeMap = {
    sm: { iconSize: 26, textClass: 'text-xl' },
    md: { iconSize: 32, textClass: 'text-2xl' },
    lg: { iconSize: 40, textClass: 'text-3xl' },
  };

  const currentSize = typeof size === 'number'
    ? { iconSize: size, textClass: 'text-2xl' }
    : (sizeMap[size] || sizeMap.md);

  const textColor = variant === 'white' ? '#FFFFFF' : 'var(--cobalt, #0047AB)';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <LogoIcon size={currentSize.iconSize} variant={variant} />

      {showText && (
        <span
          className={`font-extrabold tracking-tight ${currentSize.textClass} ${textClassName}`}
          style={{
            fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
            letterSpacing: '-0.03em',
            color: textColor,
          }}
        >
          Floorly
        </span>
      )}
    </div>
  );
}
