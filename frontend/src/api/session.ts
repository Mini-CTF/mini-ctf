const tokenKey = 'mini-ctf-token'

// A tab owns its own login token. This prevents a newly authenticated tab
// from silently replacing the token used by an already-open page.
export function getAuthToken(): string | null {
  const token = sessionStorage.getItem(tokenKey)
  if (token) return token

  // One-time migration for users who were signed in before tab-scoped
  // sessions were introduced.
  const legacyToken = localStorage.getItem(tokenKey)
  if (legacyToken) {
    sessionStorage.setItem(tokenKey, legacyToken)
    localStorage.removeItem(tokenKey)
  }
  return legacyToken
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(tokenKey, token)
  localStorage.removeItem(tokenKey)
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(tokenKey)
  localStorage.removeItem(tokenKey)
}
