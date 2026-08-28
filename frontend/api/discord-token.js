import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import process from 'node:process'

const DISCORD_TOKEN_ENDPOINT = 'https://discord.com/api/v10/oauth2/token'
const USER_AGENT = 'FlagBox (https://flagbox.vercel.app, 0.1)'
const ALLOWED_REDIRECT_URIS = new Set([
  'https://mini-ctf-backend.onrender.com/login/oauth2/code/discord',
  'http://localhost:8080/login/oauth2/code/discord',
])

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(left ?? '')
  const rightBuffer = Buffer.from(right ?? '')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function requestParameters(body) {
  if (typeof body === 'string') return new URLSearchParams(body)
  if (Buffer.isBuffer(body)) return new URLSearchParams(body.toString('utf8'))
  if (body && typeof body === 'object') {
    const entries = Object.entries(body).map(([key, value]) => [key, String(value)])
    return new URLSearchParams(entries)
  }
  return new URLSearchParams()
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'method_not_allowed' })
  }

  const expectedClientId = process.env.DISCORD_CLIENT_ID
  const expectedClientSecret = process.env.DISCORD_CLIENT_SECRET
  if (!expectedClientId || !expectedClientSecret) {
    return response.status(503).json({ error: 'discord_proxy_not_configured' })
  }

  const parameters = requestParameters(request.body)
  const clientId = parameters.get('client_id')
  const clientSecret = parameters.get('client_secret')
  const grantType = parameters.get('grant_type')
  const redirectUri = parameters.get('redirect_uri')
  const code = parameters.get('code')

  if (!secureEqual(clientId, expectedClientId) || !secureEqual(clientSecret, expectedClientSecret)) {
    return response.status(401).json({ error: 'invalid_client' })
  }
  if (grantType !== 'authorization_code' || !code || !ALLOWED_REDIRECT_URIS.has(redirectUri)) {
    return response.status(400).json({ error: 'invalid_request' })
  }

  parameters.set('client_id', expectedClientId)
  parameters.set('client_secret', expectedClientSecret)

  const upstream = await fetch(DISCORD_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: parameters.toString(),
  })
  const body = await upstream.text()

  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
  const retryAfter = upstream.headers.get('retry-after')
  if (retryAfter) response.setHeader('Retry-After', retryAfter)
  return response.status(upstream.status).send(body)
}
