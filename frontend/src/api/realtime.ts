import type { DeletedDirectMessage, DirectMessage, Friend } from '../types/api'
import { getAuthToken } from './session'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export function subscribeToSocialUpdates({ onMessage, onMessageDeleted, onFriendship }: { onMessage: (message: DirectMessage) => void; onMessageDeleted: (message: DeletedDirectMessage) => void; onFriendship: (friendship: Friend) => void }): () => void {
  const token = getAuthToken()
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
          const eventName = event.split('\n').find((line) => line.startsWith('event:'))?.slice(6)
          const data = event.split('\n').find((line) => line.startsWith('data:'))?.slice(5)
          if (!data) continue
          if (eventName === 'direct-message') onMessage(JSON.parse(data) as DirectMessage)
          if (eventName === 'direct-message-deleted') onMessageDeleted(JSON.parse(data) as DeletedDirectMessage)
          if (eventName === 'friendship') onFriendship(JSON.parse(data) as Friend)
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) console.debug('Live message stream disconnected', cause)
    }
  })()
  return () => controller.abort()
}
