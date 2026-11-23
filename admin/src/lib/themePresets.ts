// ---------------------------------------------------------------------------
// Presets de temporada de Eclipse Tech.
// Se combinan con los temas guardados en Firestore: si un tema ya fue
// personalizado, la versión guardada tiene prioridad.
// ---------------------------------------------------------------------------

export interface ThemePreset {
  key: string
  label: string
  description: string
  emoji: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  fontStyle: string
  customCss: string
}

function flair(emoji: string, glow: string, tint: string): string {
  return [
    // La tipografía de temporada se luce en títulos; el texto de lectura queda limpio.
    `body { font-family: 'Sora', ui-sans-serif, system-ui, sans-serif; }`,
    `h1, h2, h3, h4, .font-display { font-family: var(--font-display), 'Sora', ui-serif, serif; text-shadow: 0 0 26px ${glow}; }`,
    `body::after { content: '${emoji}'; position: fixed; right: 22px; bottom: 14px; font-size: 76px; line-height: 1; opacity: .2; pointer-events: none; z-index: 1; filter: drop-shadow(0 0 18px ${tint}); animation: eclipse-float 6s ease-in-out infinite; }`,
    `@keyframes eclipse-float { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-14px) rotate(4deg); } }`,
  ].join('\n')
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'base',
    label: 'Cyber Dark',
    description: 'El look insignia: violeta neón sobre negro profundo.',
    emoji: '🌌',
    primaryColor: '#8B5CF6',
    secondaryColor: '#22D3EE',
    accentColor: '#FBBF24',
    backgroundColor: '#06060D',
    fontStyle: 'Sora',
    customCss: '',
  },
  {
    key: 'autumn',
    label: 'Otoño',
    description: 'Ámbar, cobre y hojas cálidas.',
    emoji: '🍂',
    primaryColor: '#F59E0B',
    secondaryColor: '#EA580C',
    accentColor: '#FCD34D',
    backgroundColor: '#150D05',
    fontStyle: 'Fraunces',
    customCss: flair('🍂', 'rgba(245,158,11,.28)', 'rgba(234,88,12,.45)'),
  },
  {
    key: 'halloween',
    label: 'Halloween',
    description: 'Naranja calabaza, púrpura embrujado y brillo fantasmal.',
    emoji: '🎃',
    primaryColor: '#F97316',
    secondaryColor: '#A855F7',
    accentColor: '#FDE047',
    backgroundColor: '#100616',
    fontStyle: 'Special Elite',
    customCss: flair('🎃', 'rgba(249,115,22,.4)', 'rgba(168,85,247,.5)'),
  },
  {
    key: 'christmas',
    label: 'Navidad',
    description: 'Rojo navideño, verde pino y oro con copos de nieve.',
    emoji: '🎄',
    primaryColor: '#E11D48',
    secondaryColor: '#22C55E',
    accentColor: '#FACC15',
    backgroundColor: '#07130C',
    fontStyle: 'Mountains of Christmas',
    customCss: flair('🎄', 'rgba(250,204,21,.35)', 'rgba(34,197,94,.5)'),
  },
  {
    key: 'reyes',
    label: 'Reyes Magos',
    description: 'Púrpura real, oro de ofrendas y azul estrellado.',
    emoji: '👑',
    primaryColor: '#7C3AED',
    secondaryColor: '#F59E0B',
    accentColor: '#22D3EE',
    backgroundColor: '#0A0718',
    fontStyle: 'Cinzel',
    customCss: flair('👑', 'rgba(245,158,11,.35)', 'rgba(124,58,237,.55)'),
  },
  {
    key: 'mothers',
    label: 'Día de la Madre',
    description: 'Rosa suave, durazno y destellos de oro.',
    emoji: '🌷',
    primaryColor: '#EC4899',
    secondaryColor: '#FB7185',
    accentColor: '#FDE68A',
    backgroundColor: '#220A19',
    fontStyle: 'Playfair Display',
    customCss: flair('🌷', 'rgba(236,72,153,.35)', 'rgba(251,113,133,.5)'),
  },
  {
    key: 'children',
    label: 'Día del Niño',
    description: 'Cian eléctrico, amarillo y rosa con energía de fiesta.',
    emoji: '🎈',
    primaryColor: '#06B6D4',
    secondaryColor: '#FACC15',
    accentColor: '#F472B6',
    backgroundColor: '#041826',
    fontStyle: 'Fredoka',
    customCss: flair('🎈', 'rgba(6,182,212,.4)', 'rgba(244,114,182,.55)'),
  },
  {
    key: 'fathers',
    label: 'Día del Padre',
    description: 'Azul acero, celeste y detalles en cobre.',
    emoji: '👔',
    primaryColor: '#2563EB',
    secondaryColor: '#0EA5E9',
    accentColor: '#F59E0B',
    backgroundColor: '#071120',
    fontStyle: 'Oswald',
    customCss: flair('👔', 'rgba(37,99,235,.4)', 'rgba(14,165,233,.5)'),
  },
  {
    key: 'diademuertos',
    label: 'Día de Muertos',
    description: 'Violeta de altar, naranja marigold y rosa mexicano sobre la noche.',
    emoji: '💀',
    primaryColor: '#A855F7',
    secondaryColor: '#F59E0B',
    accentColor: '#EC4899',
    backgroundColor: '#0A0510',
    fontStyle: 'Special Elite',
    customCss: [
      flair('💀', 'rgba(168,85,247,.55)', 'rgba(245,158,11,.65)'),
      `body { background-color: #0A0510 !important; }`,
      `body::before { content: '💀  🌸  💀'; position: fixed; top: 14px; left: 22px; z-index: 1; font-size: 22px; letter-spacing: 1.1rem; opacity: .16; pointer-events: none; filter: drop-shadow(0 0 12px rgba(245,158,11,.8)); animation: altar-sway 8s ease-in-out infinite; }`,
      `@keyframes altar-sway { 0%, 100% { transform: translateX(0) rotate(-2deg); } 50% { transform: translateX(12px) rotate(3deg); } }`,
      `h1, h2, h3, .font-display { color: #FDE68A; text-shadow: 0 0 20px rgba(168,85,247,.8), 0 0 46px rgba(236,72,153,.45); }`,
    ].join('\n'),
  },
  {
    key: 'grito',
    label: 'Día del Grito',
    description: 'Verde, blanco y rojo con luces de fiesta patria.',
    emoji: '🇲🇽',
    primaryColor: '#16A34A',
    secondaryColor: '#F8FAFC',
    accentColor: '#DC2626',
    backgroundColor: '#07140B',
    fontStyle: 'Cinzel',
    customCss: [
      flair('🇲🇽', 'rgba(34,197,94,.5)', 'rgba(225,29,72,.6)'),
      `body::before { content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none; background: linear-gradient(90deg, rgb(22 163 74 / .16), rgb(255 255 255 / .04) 50%, rgb(220 38 38 / .16)); }`,
      `h1, h2, h3, .font-display { text-shadow: 0 0 22px rgb(34 197 94 / .6), 0 0 48px rgb(225 29 72 / .4); animation: grito-glow 4s ease-in-out infinite; }`,
      `@keyframes grito-glow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.2); } }`,
    ].join('\n'),
  },
  {
    key: 'amor',
    label: 'Amor y Amistad',
    description: 'Rosa, rojo y fucsia con destellos románticos.',
    emoji: '💞',
    primaryColor: '#EC4899',
    secondaryColor: '#E11D48',
    accentColor: '#D946EF',
    backgroundColor: '#1A0716',
    fontStyle: 'Playfair Display',
    customCss: [
      flair('💞', 'rgba(236,72,153,.55)', 'rgba(225,29,72,.6)'),
      `body { background-color: #1A0716 !important; }`,
      `body::before { content: '💞  ❤  💞'; position: fixed; top: 18%; left: 18px; z-index: 1; font-size: 20px; letter-spacing: .8rem; opacity: .18; pointer-events: none; filter: drop-shadow(0 0 14px rgba(217,70,239,.85)); animation: love-drift 7s ease-in-out infinite; }`,
      `@keyframes love-drift { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-22px) rotate(4deg); } }`,
      `h1, h2, h3, .font-display { color: #FFE4E6; text-shadow: 0 0 20px rgba(236,72,153,.75), 0 0 48px rgba(217,70,239,.5); }`,
    ].join('\n'),
  },
]

export const PRESET_ORDER: string[] = THEME_PRESETS.map((preset) => preset.key)

export const THEME_PRESET_BY_KEY: Record<string, ThemePreset> = Object.fromEntries(
  THEME_PRESETS.map((preset) => [preset.key, preset]),
)

export const THEME_LABELS: Record<string, string> = Object.fromEntries(
  THEME_PRESETS.map((preset) => [preset.key, preset.label]),
)
