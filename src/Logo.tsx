import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'symbol' | 'on-dark';
  showSubtitle?: boolean;
  showTagline?: boolean;
}

export default function Logo({
  className = "h-12",
  variant = 'full',
  showSubtitle = true,
  showTagline = false
}: LogoProps) {
  const isDark = variant === 'on-dark';
  const isSymbolOnly = variant === 'symbol';
  const isCompact = variant === 'compact';

  const textColorStructu = isDark ? "#FFFFFF" : "#0D1B2A";
  const textColorSight = "#2563EB";
  const subtitleColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* 3D Geometric Structural S-Mark SVG */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto shrink-0 drop-shadow-sm"
        style={{ minWidth: '32px' }}
      >
        {/* Outer Structural Hexagonal Framework */}
        {/* Top Roof & Left Spine */}
        <path
          d="M50 8 L88 30 V52 L72 43 V39 L50 26 L28 39 V61 L50 74 L72 61 V55 L88 64 V70 L50 92 L12 70 V30 L50 8 Z"
          fill="#0D1B2A"
        />

        {/* Primary Geometric Facets - Deep Navy */}
        <path
          d="M50 8 L88 30 V45 L50 23 L20 40 V30 L50 8 Z"
          fill="#0D1B2A"
        />

        {/* Upper Inner Facet - Intelligence Blue */}
        <path
          d="M50 23 L80 40 V50 L50 33 L30 44 V37 L50 23 Z"
          fill="#2563EB"
        />

        {/* Center Structural Columns / Architectural Verticality */}
        <path
          d="M36 42 L46 36 V70 L36 76 V42 Z"
          fill="#1D4ED8"
        />
        <path
          d="M48 35 L58 29 V63 L48 69 V35 Z"
          fill="#2563EB"
        />
        <path
          d="M60 28 L70 22 V56 L60 62 V28 Z"
          fill="#3B82F6"
        />

        {/* Lower S-Curve Returning Facet - Navy & Steel */}
        <path
          d="M50 74 L80 57 V67 L50 84 L20 67 V60 L50 77 L72 64 V57 L50 70 Z"
          fill="#0D1B2A"
        />

        {/* Bright Intelligence Accent Shard */}
        <path
          d="M50 77 L72 64 V70 L50 84 Z"
          fill="#2563EB"
        />
        <path
          d="M28 39 L50 26 V33 L28 46 V39 Z"
          fill="#60A5FA"
        />
      </svg>

      {/* Typography Section */}
      {!isSymbolOnly && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-baseline tracking-tight font-extrabold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <span className="text-xl md:text-2xl" style={{ color: textColorStructu, fontWeight: 800 }}>
              Structu
            </span>
            <span className="text-xl md:text-2xl" style={{ color: textColorSight, fontWeight: 800 }}>
              Sight
            </span>
          </div>

          {!isCompact && showSubtitle && (
            <span
              className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase mt-1"
              style={{ color: subtitleColor, fontFamily: 'Montserrat, sans-serif' }}
            >
              ENGINEERING INTELLIGENCE PLATFORM
            </span>
          )}

          {!isCompact && showTagline && (
            <span
              className="text-[9px] font-extrabold tracking-wider uppercase mt-1 text-blue-600"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              SEE STRUCTURE. BUILD BETTER.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
