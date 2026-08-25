import http from 'node:http'

const port = Number(process.env.OAUTH_PROXY_PORT ?? 8090)
const routes = {
  '/oauth/token/google': 'https://oauth2.googleapis.com/token',
  '/oauth/user/google': 'https://openidconnect.googleapis.com/v1/userinfo',
  '/oauth/jwks/google': 'https://www.googleapis.com/oauth2/v3/certs',
  '/oauth/token/github': 'https://github.com/login/oauth/access_token',
  '/oauth/user/github': 'https://api.github.com/user',
  '/oauth/token/discord': 'https://discord.com/api/oauth2/token',
  '/oauth/user/discord': 'https://discord.com/api/users/@me',
}

const forwardedHeaders = (headers) => {
  const allowed = ['accept', 'authorization', 'content-type', 'user-agent']
  return Object.fromEntries(allowed.flatMap((name) => headers[name] ? [[name, headers[name]]] : []))
}

const server = http.createServer(async (request, response) => {
  const target = routes[new URL(request.url, `http://${request.headers.host}`).pathname]
  if (!target) {
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: 'unknown_oauth_proxy_route' }))
    return
  }

  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = chunks.length ? Buffer.concat(chunks) : undefined

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: forwardedHeaders(request.headers),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
      redirect: 'manual',
    })
    const responseBody = Buffer.from(await upstream.arrayBuffer())
    response.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    })
    response.end(responseBody)
  } catch (error) {
    console.error(`OAuth proxy failed for ${request.method} ${request.url}:`, error.message)
    response.writeHead(502, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: 'oauth_proxy_unavailable' }))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`OAuth local proxy listening on http://127.0.0.1:${port}`)
})
