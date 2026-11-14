import type { AchievementIconType, AchievementRank } from '../game/types';

interface AchievementMedalProps {
  rank: AchievementRank;
  icon: AchievementIconType;
  locked?: boolean;
  size?: number;
}

const RANK_PALETTE: Record<
  AchievementRank,
  { outer: string; inner: string; ring: string; ink: string; ribbon: string }
> = {
  matcha: {
    outer: '#4A773E',
    inner: '#EBF3E0',
    ring: '#7BA867',
    ink: '#2C4B24',
    ribbon: '#3D6B35',
  },
  sakura: {
    outer: '#C45B6B',
    inner: '#FDF2F4',
    ring: '#E398A2',
    ink: '#8C2F3E',
    ribbon: '#B84A5B',
  },
  gold: {
    outer: '#C48118',
    inner: '#FFF7DF',
    ring: '#EAB949',
    ink: '#7C4B08',
    ribbon: '#346130',
  },
};

function renderGlyph(icon: AchievementIconType, color: string) {
  switch (icon) {
    case 'sprout':
      return (
        <g stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M24 33V19" />
          <path d="M24 23c0-5 5-8 9-7-1 5-4 8-9 7z" fill={color} fillOpacity="0.22" />
          <path d="M24 26c0-5-5-8-9-7 1 5 4 8 9 7z" fill={color} fillOpacity="0.22" />
        </g>
      );
    case 'whisk':
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round" fill="none">
          <rect x="21" y="27" width="6" height="6" rx="1.5" fill={color} fillOpacity="0.25" />
          <path d="M21 27c-3-5-3-10 0-13M24 27V13M27 27c3-5 3-10 0-13" />
          <path d="M18.5 19c1.5-4 9.5-4 11 0" />
        </g>
      );
    case 'craft':
      return (
        <g fill={color}>
          <rect x="14" y="26" width="20" height="5" rx="2" />
          <rect x="16" y="20" width="16" height="4.5" rx="1.5" fillOpacity="0.7" />
          <rect x="18" y="14" width="12" height="4.5" rx="1.5" />
        </g>
      );
    case 'star':
      return (
        <path
          d="M24 12.5l3.2 6.8 7.3 1-5.3 5.1 1.3 7.3-6.5-3.5-6.5 3.5 1.3-7.3-5.3-5.1 7.3-1z"
          fill={color}
          fillOpacity="0.24"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );
    case 'moon':
      return (
        <g fill={color}>
          <path d="M27.5 14a10 10 0 1 0 6.5 17.6A8.5 8.5 0 0 1 27.5 14z" />
          <circle cx="31" cy="17" r="1.4" />
        </g>
      );
    case 'torii':
      return (
        <g stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M13 17c4 2 18 2 22 0" />
          <path d="M15 21h18" />
          <path d="M18 18v14M30 18v14" />
          <path d="M24 18v3" />
        </g>
      );
    case 'crown':
      return (
        <path
          d="M13.5 29.5l2-11.5 5.5 5 3-7 3 7 5.5-5 2 11.5z"
          fill={color}
          fillOpacity="0.28"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );
    case 'needle':
      return (
        <g stroke={color} strokeWidth="2.1" strokeLinecap="round" fill="none">
          <path d="M16 32h16" />
          <path d="M24 13v16" />
          <path d="M20 23l4 6 4-6" fill={color} fillOpacity="0.2" />
        </g>
      );
    case 'seal':
      return (
        <g stroke={color} strokeWidth="2" fill="none">
          <rect x="15.5" y="15.5" width="17" height="17" rx="3" fill={color} fillOpacity="0.18" />
          <path d="M20 21h8M24 21v7M20 27.5h8" strokeLinecap="round" />
        </g>
      );
  }
}

export function AchievementMedal({
  rank,
  icon,
  locked = false,
  size = 48,
}: AchievementMedalProps) {
  const palette = locked
    ? {
        outer: '#B6ADA0',
        inner: '#EFEAE1',
        ring: '#CEC6BA',
        ink: '#8C8377',
        ribbon: '#9E9487',
      }
    : RANK_PALETTE[rank];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="shrink-0 block"
      aria-hidden="true"
    >
      {/* Subtle lower Wagashi ribbon tails */}
      <path d="M16 35l-2 10 6-3 4 3 4-3 6 3-2-10z" fill={palette.ribbon} opacity={locked ? 0.45 : 0.9} />
      {/* Scalloped / ringed Japanese Kamon crest body */}
      <circle cx="24" cy="23" r="17.5" fill={palette.outer} />
      <circle cx="24" cy="23" r="14.5" fill={palette.inner} stroke={palette.ring} strokeWidth="1.5" />
      <circle
        cx="24"
        cy="23"
        r="12.2"
        fill="none"
        stroke={palette.ring}
        strokeWidth="0.8"
        strokeDasharray="2 2"
      />
      {renderGlyph(icon, palette.ink)}
    </svg>
  );
}
