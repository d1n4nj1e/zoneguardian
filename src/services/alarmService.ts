/**
 * =================================
 * ALARM SERVICE (GLOBAL)
 * =================================
 * Centralized alarm management.
 * Not controlled by components.
 * Proper cleanup to prevent ghost alarms.
 *
 * Pattern:
 * - Module-level state for current alarm status
 * - playAlarm() to trigger
 * - stopAlarm() to clear
 * - Global cleanup on logout/app exit
 */

type AlarmStatus = 'safe' | 'warning' | 'danger'

// ================================
// STATE
// ================================
let currentAlarmStatus: AlarmStatus = 'safe'

// ================================
// AUDIO INITIALIZATION
// ================================
const warningSound = new Audio('/sounds/warning.mp3')
const dangerSound = new Audio('/sounds/danger.mp3')

warningSound.volume = 0.6
dangerSound.volume = 1
warningSound.loop = true
dangerSound.loop = false

// Preload to avoid delays
warningSound.preload = 'auto'
dangerSound.preload = 'auto'

// ================================
// USER PREFERENCES
// ================================
function isSoundEnabled() {
  const setting = localStorage.getItem('mg_sound')
  // default to true if not set
  return setting !== 'false'
}

function isVibrationEnabled() {
  const setting = localStorage.getItem('mg_vibration')
  // default to true if not set
  return setting !== 'false'
}

// ================================
// VIBRATION
// ================================
function vibrate(pattern: number | number[]) {
  if (!isVibrationEnabled()) return

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch (e) {
      console.warn('[alarmService] Vibration not available:', e)
    }
  }
}

// ================================
// STOP ALL SOUNDS
// ================================
export function stopAlarm() {
  console.log('[alarmService] Stopping all alarms')

  try {
    warningSound.pause()
    warningSound.currentTime = 0

    dangerSound.pause()
    dangerSound.currentTime = 0

    // Clear all vibrations
    if ('vibrate' in navigator) {
      navigator.vibrate(0)
    }
  } catch (e) {
    console.error('[alarmService] Error stopping alarm:', e)
  }

  currentAlarmStatus = 'safe'
}

// ================================
// PLAY ALARM
// ================================
export function playAlarm(status: AlarmStatus) {
  // Avoid redundant plays
  if (status === currentAlarmStatus) {
    return
  }

  console.log('[alarmService] Playing alarm:', status)

  // Always stop previous
  stopAlarm()

  // If safe, just stop
  if (status === 'safe') {
    return
  }

  // ================================
  // SOUND BLOCK
  // ================================
  if (!isSoundEnabled()) {
    console.log('[alarmService] Sound disabled, using vibration only')
    vibrate(status === 'danger' ? [800, 200, 800] : [200, 300, 200])
    currentAlarmStatus = status
    return
  }

  // ================================
  // PLAY APPROPRIATE SOUND
  // ================================
  if (status === 'warning') {
    warningSound.play().catch(err => {
      console.warn('[alarmService] Warning sound play failed:', err)
      vibrate([200, 300, 200])
    })
    vibrate([200, 300, 200])
  } else if (status === 'danger') {
    dangerSound.play().catch(err => {
      console.warn('[alarmService] Danger sound play failed:', err)
      vibrate([800, 200, 800])
    })
    vibrate([800, 200, 800])
  }

  currentAlarmStatus = status
}

// ================================
// GET CURRENT STATUS
// ================================
export function getAlarmStatus(): AlarmStatus {
  return currentAlarmStatus
}

// ================================
// GLOBAL CLEANUP (CRITICAL!)
// ================================
export function cleanupAlarm() {
  console.log('[alarmService] Global cleanup')
  stopAlarm()

  // Remove event listeners if any
  if (warningSound) {
    warningSound.pause()
    warningSound.currentTime = 0
    warningSound.src = ''
  }

  if (dangerSound) {
    dangerSound.pause()
    dangerSound.currentTime = 0
    dangerSound.src = ''
  }
}

// ================================
// ON PAGE HIDE (backgrounding)
// ================================
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    console.log('[alarmService] App backgrounding')
    // Don't stop alarm, as it might play in background
    // This is intentional for safety
  })

  window.addEventListener('pageshow', () => {
    console.log('[alarmService] App returning from background')
    // Resume alarm if needed
  })
}

// ================================
// TEST FUNCTION (for debug)
// ================================
export function testAlarm(status: AlarmStatus = 'warning') {
  console.log('[alarmService] TEST ALARM:', status)
  playAlarm(status)

  // Auto-stop after 5 seconds for testing
  setTimeout(() => {
    console.log('[alarmService] Test alarm auto-stop')
    playAlarm('safe')
  }, 5000)
}

// ================================
// AUDIO UNLOCK (autoplay policies)
// Try to unlock audio on first user interaction
// ================================
export function enableAudioUnlock() {
  if (!isSoundEnabled()) return

  let unlocked = false

  async function tryUnlock() {
    if (unlocked) return
    try {
      // Play muted to satisfy browser autoplay policies then pause
      warningSound.muted = true
      dangerSound.muted = true

      await Promise.all([
        warningSound.play().catch(() => {}),
        dangerSound.play().catch(() => {}),
      ])

      warningSound.pause()
      dangerSound.pause()

      warningSound.muted = false
      dangerSound.muted = false

      unlocked = true
      console.log('[alarmService] Audio unlocked by user interaction')
    } catch (e) {
      console.warn('[alarmService] Audio unlock attempt failed:', e)
    }
  }

  // Attach one-time listeners for common user interactions
  const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'click']
  events.forEach(evt => {
    window.addEventListener(
      evt,
      () => {
        tryUnlock()
      },
      { once: true }
    )
  })
}
