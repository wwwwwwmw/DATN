import { useEffect, useRef } from 'react'

const CHANNEL_NAME = 'medtech_realtime_sync_v1'
const LOCAL_EVENT_NAME = 'medtech:data-updated'

let broadcastChannel: BroadcastChannel | null = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
  }
} catch {
  broadcastChannel = null
}

/**
 * Phát tín hiệu cập nhật dữ liệu tức thì (0ms) cho tất cả các component đang mở
 * trên cùng tab cũng như các tab trình duyệt khác.
 */
export function emitDataChange(scope: string = 'all') {
  const payload = { scope, timestamp: Date.now() }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: payload }))
  }
  try {
    broadcastChannel?.postMessage(payload)
  } catch {
    // ignore if channel closed
  }
}

/**
 * Hook tự động đồng bộ dữ liệu thời gian thực (Độ trễ thấp):
 * 1. Lắng nghe sự kiện thay đổi dữ liệu tức thì (cùng tab & khác tab qua BroadcastChannel).
 * 2. Tự động tải lại ngầm (silent polling) định kỳ mỗi `intervalMs` (mặc định 3000ms) mà không gây nháy giao diện.
 * 3. Tự động đồng bộ ngay khi người dùng chuyển lại tab (focus / visibilitychange).
 */
export function useRealtimeSync(onSync: () => void, intervalMs: number = 3000) {
  const callbackRef = useRef(onSync)
  callbackRef.current = onSync

  useEffect(() => {
    const triggerSync = () => {
      if (document.visibilityState === 'hidden') return
      callbackRef.current()
    }

    const intervalId = setInterval(triggerSync, intervalMs)

    const handleLocalEvent = () => callbackRef.current()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current()
      }
    }

    let channel: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL_NAME)
        channel.onmessage = () => callbackRef.current()
      }
    } catch {
      channel = null
    }

    window.addEventListener(LOCAL_EVENT_NAME, handleLocalEvent)
    window.addEventListener('focus', handleLocalEvent)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener(LOCAL_EVENT_NAME, handleLocalEvent)
      window.removeEventListener('focus', handleLocalEvent)
      document.removeEventListener('visibilitychange', handleVisibility)
      try {
        channel?.close()
      } catch {
        // ignore
      }
    }
  }, [intervalMs])
}

