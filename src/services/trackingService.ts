/**
 * =================================
 * GLOBAL TRACKING SERVICE
 * =================================
 * Persistent geolocation tracking.
 * + Auto update asset position to DB
 */

import { supabase } from '@/lib/supabase'

export type TrackingState = {
  position: [number, number] | null
  error: string | null
  isWatching: boolean
  accuracy: number | null
  // effective altitude exposed to subscribers (device or simulated)
  altitude?: number | null
  // internal: device-reported altitude (may be null)
  deviceAltitude?: number | null
  // internal: simulated altitude (set via debug UI)
  simulatedAltitude?: number | null
  // internal: when true, simulatedAltitude takes precedence
  simulatedActive?: boolean
}

// ================================
// GLOBAL STATE (singleton)
// ================================
let state: TrackingState = {
  position: null,
  error: null,
  isWatching: false,
  accuracy: null,
  altitude: null,
  deviceAltitude: null,
  simulatedAltitude: null,
  simulatedActive: false,
}

let watchId: number | null = null
let subscribers: Set<(state: TrackingState) => void> = new Set()

// 🔥 asset binding
let currentAssetId: string | null = null

// 🔥 anti spam (throttle DB update)
let lastDbUpdate = 0
const DB_UPDATE_INTERVAL = 3000 // 3 seconds

// ================================
// BIND ASSET (call after login)
// ================================
export function bindTrackingToAsset(assetId: string) {
  currentAssetId = assetId
  console.log('[trackingService] Bound to asset:', assetId)
}

// ================================
// SUBSCRIPTION SYSTEM
// ================================
export function subscribe(callback: (state: TrackingState) => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function notifySubscribers() {
  subscribers.forEach(callback => callback(state))
}

export function getTrackingState(): TrackingState {
  return { ...state }
}

// ================================
// START TRACKING
// ================================
export function startTracking() {
  if (state.isWatching) return

  if (!('geolocation' in navigator)) {
    state.error = 'Geolocation not supported'
    notifySubscribers()
    return
  }

  console.log('[trackingService] Starting GPS watch...')

  watchId = navigator.geolocation.watchPosition(
    async position => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const accuracy = position.coords.accuracy
      const altitude = typeof position.coords.altitude === 'number' ? position.coords.altitude : null

      // update deviceAltitude then derive effective altitude
      const deviceAltitude = altitude
      const simulatedAltitude = state.simulatedAltitude ?? null
      const simulatedActive = !!state.simulatedActive
      const effectiveAltitude = simulatedActive
        ? simulatedAltitude
        : deviceAltitude

      state = {
        position: [lat, lng],
        accuracy,
        altitude: effectiveAltitude,
        deviceAltitude,
        simulatedAltitude,
        simulatedActive,
        error: null,
        isWatching: true,
      }

      notifySubscribers()

      // ==============================
      // 🔥 UPDATE ASSET POSITION TO DB
      // ==============================
      if (currentAssetId) {
        const now = Date.now()

        if (now - lastDbUpdate > DB_UPDATE_INTERVAL) {
          lastDbUpdate = now

          const { error } = await supabase
            .from('assets')
            .update({
              lat,
              lng,
              last_seen: new Date().toISOString(),
            })
            .eq('id', currentAssetId)

          if (error) {
            console.error('[trackingService] Asset update error:', error.message)
          } else {
            console.log('[trackingService] Asset position synced')
          }
        }
      }
    },
    error => {
      state.error = error.message
      state.isWatching = false
      notifySubscribers()
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    }
  )

  state.isWatching = true
  notifySubscribers()
}

// Allows tests / debug UI to inject a simulated altitude for subscribers
export function setSimulatedAltitude(altitude: number | null) {
  // altitude !== null => enable simulated mode and store value
  if (altitude !== null && !Number.isNaN(altitude)) {
    state = {
      ...state,
      simulatedAltitude: altitude,
      simulatedActive: true,
      // expose simulated value immediately
      altitude,
    }
  } else {
    // clear simulated mode; revert to device altitude
    const deviceAltitude = state.deviceAltitude ?? null
    state = {
      ...state,
      simulatedAltitude: null,
      simulatedActive: false,
      altitude: deviceAltitude,
    }
  }

  notifySubscribers()
}

// ================================
// STOP TRACKING
// ================================
export function stopTracking() {
  if (watchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }

  state = {
    position: null,
    error: null,
    isWatching: false,
    accuracy: null,
    altitude: null,
    deviceAltitude: null,
    simulatedAltitude: null,
    simulatedActive: false,
  }

  notifySubscribers()
}

// ================================
// CLEANUP
// ================================
export function cleanupTracking() {
  stopTracking()
  subscribers.clear()
  currentAssetId = null
}
