// Some badge icons are emoji "sequences" (a person plus a graduation cap, joined by an invisible character). Older
// systems, like Windows 10, do not know them and draw the two parts side by side, which spilled out of the badge.
// Those icons are shown as their last part (the graduation cap) instead.
export const badgeIcon = icon => {
  const s = String(icon ?? '')
  return s.includes('\u200d') ? s.split('\u200d').pop() : s
}
