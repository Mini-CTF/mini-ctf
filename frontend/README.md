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
