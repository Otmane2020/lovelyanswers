import type { CSSProperties } from 'react'

/**
 * Design tokens from the v3 landing design. Spread onto a page-root element so
 * every `var(--x)` below it resolves, without depending on a global stylesheet.
 */
export const themeVars = {
  '--ink': '#14162e',
  '--ink-soft': '#585b78',
  '--paper': '#f5f6fb',
  '--surface': '#ffffff',
  '--line': '#e4e5f0',
  '--primary': '#2e3a8c',
  '--primary-deep': '#1a2058',
  '--primary-soft': '#eef0fb',
  '--amber': '#b9700a',
  '--amber-soft': '#fdf3e2',
  '--green': '#1f8a5f',
  '--green-soft': '#e9f7f0',
  '--red': '#c23b3b',
  '--red-soft': '#fbeaea',
  '--gold': '#c79a2e',
  '--radius': '16px',
} as CSSProperties

let gradientSeq = 0

interface BrandMarkProps {
  /** Size of the rounded tile in px. */
  size?: number
  /** Render the AUTOPILOT / GEO wordmark next to the tile. */
  withText?: boolean
  /** Use light text — for dark backgrounds. */
  light?: boolean
}

/** The AutopilotGEO sparkle mark: gold orbit ring + four-point star. */
export function BrandMark({ size = 32, withText = false, light = false }: BrandMarkProps) {
  // Unique gradient id per instance so multiple marks on one page don't collide.
  const gid = `apgGold${gradientSeq++}`

  const tile = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.31,
        background: 'linear-gradient(150deg,#5f6ce0,#1a2058)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 1px rgba(215,201,138,.35)',
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: size * 0.53, height: size * 0.53, display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbeec3" />
            <stop offset="55%" stopColor="#e3c675" />
            <stop offset="100%" stopColor="#a9791b" />
          </linearGradient>
        </defs>
        <circle
          cx="50" cy="50" r="44" fill="none" stroke={`url(#${gid})`} strokeWidth="1.6"
          strokeDasharray="118 400" strokeLinecap="round" transform="rotate(-52 50 50)" opacity=".85"
        />
        <circle cx="90.6" cy="26.4" r="3.1" fill={`url(#${gid})`} />
        <path
          d="M50 8 C54.5 32 57.5 39 84 44 C57.5 49 54.5 56 50 80 C45.5 56 42.5 49 16 44 C42.5 39 45.5 32 50 8 Z"
          fill={`url(#${gid})`}
        />
        <path
          d="M76 14 C77.6 21 79 22.4 86 24 C79 25.6 77.6 27 76 34 C74.4 27 73 25.6 66 24 C73 22.4 74.4 21 76 14 Z"
          fill={`url(#${gid})`} opacity=".92"
        />
      </svg>
    </div>
  )

  if (!withText) return tile

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {tile}
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontSize: '9.5px', letterSpacing: '.18em', color: 'var(--gold, #c79a2e)', fontWeight: 700 }}>
          AUTOPILOT
        </div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: light ? '#fff' : 'var(--ink, #14162e)' }}>GEO</div>
      </div>
    </div>
  )
}
