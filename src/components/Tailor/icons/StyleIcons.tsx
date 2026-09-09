import React from 'react'

// A cohesive, minimal line-art icon set for garment style choices —
// consistent 60x60 grid, single accent color, rounded strokes throughout,
// designed to read cleanly at small sizes both on screen and on a
// printed thermal/A4 slip (which is why everything is pure stroke, no
// gradients or fills that wouldn't survive a black-and-white printer).

const STROKE = '#6366f1'
const SW = 2.5

function Icon({ children, viewBox = '0 0 60 60' }: { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke={STROKE} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  )
}

// Shared kurta-silhouette outline used as the base shape for pocket icons
const KurtaBody = () => (
  <path d="M20 12 L24 8 L36 8 L40 12 L44 20 L42 50 L18 50 L16 20 Z" />
)

// ---------- Pocket style ----------
export const PocketNone = () => (
  <Icon><KurtaBody /></Icon>
)
export const Pocket1Side = () => (
  <Icon>
    <KurtaBody />
    <path d="M34 32 L40 30 L41 38 L35 40 Z" strokeDasharray="0" />
  </Icon>
)
export const Pocket2Side = () => (
  <Icon>
    <KurtaBody />
    <path d="M34 32 L40 30 L41 38 L35 40 Z" />
    <path d="M26 32 L20 30 L19 38 L25 40 Z" />
  </Icon>
)

// ---------- Bain / collar-opening style ----------
const NeckBase = () => (
  <path d="M14 22 L18 12 L42 12 L46 22 L44 48 L16 48 Z" />
)
export const BainNone = () => (
  <Icon><NeckBase /><path d="M20 12 Q30 18 40 12" /></Icon>
)
export const GolBain = () => (
  <Icon>
    <NeckBase />
    <path d="M20 12 Q30 20 40 12" />
    <path d="M30 20 Q26 30 30 44" />
  </Icon>
)
export const SidaBain = () => (
  <Icon>
    <NeckBase />
    <path d="M20 12 Q30 18 40 12" />
    <path d="M30 16 L30 44" />
  </Icon>
)
export const HalfBain = () => (
  <Icon>
    <NeckBase />
    <path d="M20 12 Q30 18 40 12" />
    <path d="M30 16 L30 30" />
  </Icon>
)
export const GolGala = () => (
  <Icon>
    <NeckBase />
    <circle cx="30" cy="16" r="7" />
  </Icon>
)

// ---------- Collar cut style ----------
const ShirtBase = () => (
  <path d="M12 20 L20 10 L40 10 L48 20 L46 50 L14 50 Z" />
)
export const CollarNone = () => (
  <Icon><ShirtBase /><path d="M22 12 Q30 18 38 12" /></Icon>
)
export const CollarAmerican = () => (
  <Icon>
    <ShirtBase />
    <path d="M22 12 L30 24 L38 12" />
    <path d="M22 12 L15 22" />
    <path d="M38 12 L45 22" />
  </Icon>
)
export const CollarEnglish = () => (
  <Icon>
    <ShirtBase />
    <path d="M23 12 L30 26 L37 12" />
    <path d="M23 12 L18 20" />
    <path d="M37 12 L42 20" />
  </Icon>
)
export const CollarFrench = () => (
  <Icon>
    <ShirtBase />
    <path d="M25 12 L30 28 L35 12" />
    <path d="M25 12 L22 18" />
    <path d="M35 12 L38 18" />
  </Icon>
)

// ---------- Qurta / daman (hem) style ----------
const HemBody = () => (
  <path d="M20 10 L40 10 L44 44 L16 44 Z" />
)
export const DamanNone = () => (
  <Icon><HemBody /></Icon>
)
export const QurtaStyle = () => (
  <Icon>
    <HemBody />
    <path d="M17 38 L23 44" />
    <path d="M43 38 L37 44" />
  </Icon>
)
export const SidaDaman = () => (
  <Icon>
    <HemBody />
    <path d="M16 44 L44 44" strokeWidth={SW + 1} />
  </Icon>
)

export const GenericTag = () => (
  <Icon>
    <path d="M14 26 L28 12 L48 12 L48 32 L34 46 Z" />
    <circle cx="22" cy="20" r="3" />
  </Icon>
)

export const STYLE_ICONS = {
  pocket_style: {
    none: PocketNone,
    '1_side': Pocket1Side,
    '2_side': Pocket2Side,
  },
  collar_style: {
    none: BainNone,
    gol_bain: GolBain,
    sida_bain: SidaBain,
    half_bain: HalfBain,
    gol_gala: GolGala,
  },
  collar_cut: {
    none: CollarNone,
    american: CollarAmerican,
    english: CollarEnglish,
    french: CollarFrench,
  },
  qurta_style: {
    none: DamanNone,
    qurta: QurtaStyle,
    sida_daman: SidaDaman,
  },
} as const
