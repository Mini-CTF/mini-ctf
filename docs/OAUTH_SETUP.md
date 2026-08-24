Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Google, GitHub, and Discord sign-in

The backend owns the OAuth authorization-code flow and only returns a Mini CTF JWT to the
frontend after a successful provider login. Provider access tokens are not exposed to the browser.

## Local development

The Vite development server starts OAuth through its proxy, but Spring Boot receives the provider
callback directly on port `8080`. Register these exact redirect URLs in the provider consoles:

| Provider | Redirect URL |
|---|---|
| Google | `http://localhost:8080/login/oauth2/code/google` |
| GitHub | `http://localhost:8080/login/oauth2/code/github` |
| Discord | `http://localhost:8080/login/oauth2/code/discord` |

For Google, create an OAuth 2.0 **Web application** client. If its consent screen is in **Testing**,
add the Google account used for login under **Test users**. For GitHub, create an OAuth App with the
callback URL above. Do not enable callback URL wildcard matching.

Add the issued values to the local `.env` file only:

```properties
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

Restart the backend after changing `.env`. The login page queries
`GET /api/auth/oauth/providers`, so it shows only providers with a configured client ID.

## Deployment

Use HTTPS and replace `localhost:8080` with the public backend origin in both provider consoles.
Set `OAUTH_SUCCESS_REDIRECT` to `<frontend-origin>/auth/callback` and configure the reverse proxy
to forward `/api`, `/oauth2`, and `/login` to Spring Boot. Keep client secrets in the deployment
secret store; never commit them.
