/**
 * APP INITIALIZER
 * 
 * Globally initialize tracking service when auth is ready.
 * This must happen after AuthProvider, so user context is available.
 */

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  startTracking,
  cleanupTracking,
  subscribe,
} from '@/services/trackingService'

export function useTrackingInitializer() {
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    // Only start tracking if authenticated as operator
    if (!isAuthenticated || !user) {
      console.log('[appInitializer] Not authenticated, stopping tracking')
      cleanupTracking()
      return
    }

    if (user.role !== 'operator') {
      console.log('[appInitializer] Not an operator, stopping tracking')
      cleanupTracking()
      return
    }

    console.log('[appInitializer] Starting global tracking for operator:', user.id)
    startTracking()

    // Setup debug subscriber (optional, for logging)
    const unsubscribe = subscribe(state => {
      console.log('[appInitializer] Tracking state:', state)
    })

    return () => {
      console.log('[appInitializer] Cleanup on unmount')
      unsubscribe()
    }
  }, [isAuthenticated, user])

  // Also cleanup on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[appInitializer] Page unloading, cleanup')
      cleanupTracking()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}
