/**
 * DEPRECATED: Use alarmService.ts instead
 * This file is kept for backward compatibility only.
 */

import {
  playAlarm as play,
  stopAlarm as stop,
  getAlarmStatus,
  cleanupAlarm,
  testAlarm,
} from '@/services/alarmService'

export function playAlarm(status: 'safe' | 'warning' | 'danger') {
  console.warn(
    '[alarmPlayer] DEPRECATED: Use alarmService.playAlarm instead'
  )
  return play(status)
}

export function stopAlarm() {
  console.warn('[alarmPlayer] DEPRECATED: Use alarmService.stopAlarm instead')
  return stop()
}

export { getAlarmStatus, cleanupAlarm, testAlarm }

