Mini-CTF는 보안을 처음 접하는 사람도 안전하고 재미있게 해킹 기초를 학습할 수 있는 게임형 보안 교육 플랫폼입니다.

# Mini CTF frontend

The React client uses the Spring Boot API for authentication, platform statistics, challenges,
rankings, protected artifact downloads, and FLAG submissions.

## Run locally

Start the backend on port `8080`, then run:

```powershell
npm ci
npm run dev
```

Vite proxies `/api` requests to `http://localhost:8080`. To use a separately hosted API, set
`VITE_API_BASE_URL` to its `/api` base URL before starting Vite.

## Validate

```powershell
npm run lint
npm run build
```
