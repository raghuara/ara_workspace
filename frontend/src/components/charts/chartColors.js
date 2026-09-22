export const CHART_COLORS = {
  blue: '#2563EB',
  violet: '#7C3AED',
  teal: '#0D9488',
  amber: '#F59E0B',
  rose: '#F43F5E',
  green: '#22C55E',
  orange: '#F97316',
  pink: '#EC4899',
  slate: '#0EA5E9',
  gray: '#6366F1',
}

export const CHART_SEQUENCE = ['blue', 'violet', 'teal', 'orange', 'pink', 'amber', 'slate', 'gray', 'rose', 'green']

export const fillFor = (tone) => CHART_COLORS[tone] ?? CHART_COLORS.blue

export const washFor = (tone) => `${fillFor(tone)}17`
