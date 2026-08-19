import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout, RequireAuth } from './components/Layout'
import { AuthProvider } from './hooks/useAuth'
import { ChallengeDetailPage, ChallengesPage, HomePage, MyPage, RankingPage } from './pages/CorePages'
import { LoginPage, OAuthCallbackPage, RegisterPage } from './pages/AuthPages'
import './styles.css'

export default function App() {
  return <BrowserRouter><AuthProvider><Routes><Route element={<Layout />}><Route index element={<HomePage />} /><Route path="login" element={<LoginPage />} /><Route path="register" element={<RegisterPage />} /><Route path="auth/callback" element={<OAuthCallbackPage />} /><Route path="challenges" element={<ChallengesPage />} /><Route path="challenges/:id" element={<ChallengeDetailPage />} /><Route path="ranking" element={<RankingPage />} /><Route path="me" element={<RequireAuth><MyPage /></RequireAuth>} /></Route></Routes></AuthProvider></BrowserRouter>
}
