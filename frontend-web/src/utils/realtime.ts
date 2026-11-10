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
 * Phát tín hiệu cập nhật dữ liệu tức thì cho các component đang mở
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
 * Hook tự động đồng bộ dữ liệu thời gian thực (Độ trễ thấp, có chống nghẽn cổ chai):
 * 1. Lắng nghe sự kiện thay đổi dữ liệu tức thì (cùng tab & khác tab qua BroadcastChannel).
 * 2. Tự động tải lại ngầm (silent polling) định kỳ mỗi `intervalMs` mà không gây nháy giao diện.
 * 3. Throttle sự kiện focus/visibilitychange để không bị lặp khi đóng hộp thoại in hoặc chọn file.
 */
export function useRealtimeSync(onSync: () => void, intervalMs: number = 4000) {
  const callbackRef = useRef(onSync)
  const lastRunRef = useRef<number>(0)
  callbackRef.current = onSync

  useEffect(() => {
    const safeTrigger = (force = false) => {
      if (document.visibilityState === 'hidden') return
      const now = Date.now()
      if (!force && now - lastRunRef.current < 2000) return
      lastRunRef.current = now
      callbackRef.current()
    }

    const intervalId = setInterval(() => safeTrigger(false), intervalMs)
    const handleLocalEvent = () => safeTrigger(true)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        safeTrigger(false)
      }
    }

    let channel: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL_NAME)
        channel.onmessage = () => safeTrigger(true)
      }
    } catch {
      channel = null
    }

    window.addEventListener(LOCAL_EVENT_NAME, handleLocalEvent)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener(LOCAL_EVENT_NAME, handleLocalEvent)
      document.removeEventListener('visibilitychange', handleVisibility)
      try {
        channel?.close()
      } catch {
        // ignore
      }
    }
  }, [intervalMs])
}
