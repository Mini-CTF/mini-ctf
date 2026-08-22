import type { DirectMessage } from '../types/api'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export function subscribeToDirectMessages(onMessage: (message: DirectMessage) => void): () => void {
  const token = localStorage.getItem('mini-ctf-token')
  if (!token) return () => undefined
  const controller = new AbortController()

  void (async () => {
    try {
      const response = await fetch(`${baseUrl}/social/messages/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      if (!response.ok || !response.body) return
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pending = ''
      while (!controller.signal.aborted) {
        const next = await reader.read()
        if (next.done) break
        pending += decoder.decode(next.value, { stream: true })
        const events = pending.split('\n\n')
        pending = events.pop() ?? ''
        for (const event of events) {
          if (!event.startsWith('event:direct-message')) continue
          const data = event.split('\n').find((line) => line.startsWith('data:'))?.slice(5)
          if (data) onMessage(JSON.parse(data) as DirectMessage)
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) console.debug('Live message stream disconnected', cause)
    }
  })()
  return () => controller.abort()
}
