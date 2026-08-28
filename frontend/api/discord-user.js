import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import process from 'node:process'

const DISCORD_USER_ENDPOINT = 'https://discord.com/api/v10/users/@me'
const USER_AGENT = 'FlagBox (https://flagbox.vercel.app, 0.1)'

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(left ?? '')
  const rightBuffer = Buffer.from(right ?? '')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'method_not_allowed' })
  }

  const expectedProxySecret = process.env.DISCORD_CLIENT_SECRET
  const proxySecret = request.headers['x-mini-ctf-proxy-secret']
  const authorization = request.headers.authorization
  if (!expectedProxySecret || !secureEqual(proxySecret, expectedProxySecret)) {
    return response.status(401).json({ error: 'invalid_proxy_credentials' })
  }
  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'invalid_token' })
  }

  const upstream = await fetch(DISCORD_USER_ENDPOINT, {
    headers: {
      Authorization: authorization,
      'User-Agent': USER_AGENT,
    },
  })
  const body = await upstream.text()

  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
  const retryAfter = upstream.headers.get('retry-after')
  if (retryAfter) response.setHeader('Retry-After', retryAfter)
  return response.status(upstream.status).send(body)
}
