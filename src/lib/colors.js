// Task / profile colors. Stored by id in the database.
export const COLORS = [
  { id: 'blue', hex: '#3b82f6' },
  { id: 'green', hex: '#22c55e' },
  { id: 'amber', hex: '#f59e0b' },
  { id: 'red', hex: '#ef4444' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'pink', hex: '#ec4899' },
  { id: 'teal', hex: '#14b8a6' },
]

export const colorHex = id => COLORS.find(c => c.id === id)?.hex ?? COLORS[0].hex
