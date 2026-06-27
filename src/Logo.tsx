import React from 'react';

export default function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ zIndex: 9999 }}>
      {/* Eye / Lens + Upward Chart Arrow */}
      <g transform="translate(5, 5)">
        <path d="M15 5 C5 5 0 15 0 15 C0 15 5 25 15 25 C25 25 30 15 30 15 C30 15 25 5 15 5 Z" stroke="#0A192F" strokeWidth="2.5" fill="none" />
        <circle cx="15" cy="15" r="5" stroke="#D4AF37" strokeWidth="2.5" fill="none" />
        {/* KPI Arrow emerging from the eye */}
        <path d="M15 15 L22 8 L27 12 L35 2" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 2 L35 8 M35 2 L29 2" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Text: DocuSight */}
      <text x="45" y="27" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="800" fill="#0A192F" letterSpacing="-0.5">Docu</text>
      <text x="100" y="27" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="800" fill="#D4AF37" letterSpacing="-0.5">Sight</text>
    </svg>
  );
}
