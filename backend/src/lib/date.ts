const COLOMBIA_OFFSET_MS = -5 * 60 * 60 * 1000

export const getColombiaDayRange = (now: Date = new Date()) => {
  const nowCO = new Date(now.getTime() + COLOMBIA_OFFSET_MS)
  const startUTC = new Date(
    Date.UTC(nowCO.getUTCFullYear(), nowCO.getUTCMonth(), nowCO.getUTCDate(), 0, 0, 0, 0)
  )
  const today = new Date(startUTC.getTime() - COLOMBIA_OFFSET_MS)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  return { today, tomorrow }
}
