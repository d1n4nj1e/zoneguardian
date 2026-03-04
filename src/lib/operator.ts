export type UIStatus = 'safe' | 'warning' | 'danger' | 'offline'

// Compute operator UI status from last known status string and last_seen timestamp
export function computeOperatorStatus(lastStatus: string | null | undefined, lastSeen: string | null | undefined): UIStatus {
  // Offline if no lastSeen or older than 30 seconds
  if (!lastSeen) return 'offline'

  try {
    const last = new Date(lastSeen).getTime()
    const now = Date.now()
    // temporary tolerant threshold: 60 seconds to reduce flapping during testing
    if (now - last > 60_000) return 'offline'
  } catch (e) {
    return 'offline'
  }

  // Map lastStatus values to UI statuses. Be permissive with possible values.
  const s = (lastStatus || '').toString().toLowerCase()
  if (s.includes('out') || s.includes('danger') || s.includes('outside')) return 'danger'
  if (s.includes('near') || s.includes('warn')) return 'warning'
  return 'safe'
}
