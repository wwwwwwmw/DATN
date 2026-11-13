/**
 * useCallRingtone — Web Audio API hook for Telehealth call ringtones.
 *
 * Generates pleasant ringtone tones programmatically (no external audio files).
 * - Outgoing ring: gentle dual-tone "ring-ring" pattern (like a phone ringing out)
 * - Incoming notification: short ascending chime when other party enters room
 * - Auto-stops when both parties are connected
 */
import { useEffect, useRef, useCallback } from 'react'

type RingtoneType = 'outgoing' | 'incoming' | 'none'

interface UseCallRingtoneOptions {
  isInCall: boolean
  bothConnected: boolean
  otherPartyInRoom: boolean
  isCallModalOpen: boolean
}

export function useCallRingtone({
  isInCall,
  bothConnected,
  otherPartyInRoom,
  isCallModalOpen,
}: UseCallRingtoneOptions) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeTypeRef = useRef<RingtoneType>('none')

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return audioCtxRef.current
  }, [])

  /**
   * Play a single ring burst: two short tones separated by a brief gap.
   * Mimics a classic phone "ring-ring" sound.
   */
  const playOutgoingBurst = useCallback(() => {
    try {
      const ctx = getAudioCtx()
      const now = ctx.currentTime

      // Two-tone burst: 440Hz + 480Hz (North American ringback tone frequencies)
      const playTone = (startTime: number, duration: number) => {
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sine'
        osc1.frequency.value = 440
        osc2.type = 'sine'
        osc2.frequency.value = 480

        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.03) // Soft fade in
        gain.gain.setValueAtTime(0.08, startTime + duration - 0.03)
        gain.gain.linearRampToValueAtTime(0, startTime + duration) // Soft fade out

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)

        osc1.start(startTime)
        osc1.stop(startTime + duration)
        osc2.start(startTime)
        osc2.stop(startTime + duration)
      }

      // Ring pattern: 0.4s tone — 0.2s gap — 0.4s tone
      playTone(now, 0.4)
      playTone(now + 0.6, 0.4)
    } catch {
      // AudioContext not available or user hasn't interacted yet
    }
  }, [getAudioCtx])

  /**
   * Play a pleasant ascending chime: 3 quick notes going up.
   * Used as a notification when the other party enters the room.
   */
  const playIncomingChime = useCallback(() => {
    try {
      const ctx = getAudioCtx()
      const now = ctx.currentTime

      const notes = [523.25, 659.25, 783.99] // C5, E5, G5 — major triad
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.value = freq

        const start = now + i * 0.15
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.12, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.4)
      })
    } catch {
      // Silently fail
    }
  }, [getAudioCtx])

  /** Stop all ongoing ringtone playback */
  const stopRingtone = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    activeTypeRef.current = 'none'
  }, [])

  /** Start outgoing ring loop (ring-ring every 3 seconds) */
  const startOutgoingRing = useCallback(() => {
    if (activeTypeRef.current === 'outgoing') return // Already ringing
    stopRingtone()
    activeTypeRef.current = 'outgoing'
    playOutgoingBurst() // Play immediately
    intervalRef.current = setInterval(() => {
      playOutgoingBurst()
    }, 3000) // Repeat every 3 seconds
  }, [stopRingtone, playOutgoingBurst])

  // Determine ringtone state based on call state
  useEffect(() => {
    if (bothConnected) {
      // Both connected → stop all ringtones
      stopRingtone()
      return
    }

    if (isInCall && isCallModalOpen && !bothConnected) {
      // I'm in call but other party hasn't joined yet → outgoing ringing
      startOutgoingRing()
      return
    }

    if (!isInCall && otherPartyInRoom) {
      // Not in call but other party is waiting → play incoming chime once
      if (activeTypeRef.current !== 'incoming') {
        stopRingtone()
        activeTypeRef.current = 'incoming'
        playIncomingChime()
        // Repeat chime every 5 seconds while they're waiting
        intervalRef.current = setInterval(() => {
          playIncomingChime()
        }, 5000)
      }
      return
    }

    // Default: no ringtone needed
    stopRingtone()
  }, [isInCall, bothConnected, otherPartyInRoom, isCallModalOpen, stopRingtone, startOutgoingRing, playIncomingChime])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone()
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {})
      }
    }
  }, [stopRingtone])

  return { stopRingtone, playIncomingChime }
}

