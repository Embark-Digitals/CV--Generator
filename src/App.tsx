import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { SignInPage } from '@/pages/auth/sign-in'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password'
import { SetPasswordPage } from '@/pages/auth/set-password'
import { AuthCallbackPage } from '@/pages/auth/callback'
import { DashboardPage } from '@/pages/dashboard'
import { ProfilePage } from '@/pages/profile'
import { ImportPage } from '@/pages/import'
import { ApplicationsPage } from '@/pages/applications'
import { ApplicationDetailPage } from '@/pages/applications/detail'
import { TailorPage } from '@/pages/tailor'
import { SettingsPage } from '@/pages/settings'
import { NotFoundPage } from '@/pages/not-found'
import {
  AUTH_CALLBACK_PATH,
  markCallbackConsumed,
  shouldRouteToCallback,
} from '@/features/auth/callback'

export default function App() {
  const location = useLocation()

  // An invite link redirects to the Site URL root carrying the auth hash.
  // Route that (and any stray callback landing) to the dedicated handler once,
  // so invited/recovering users are never dropped on the normal login screen.
  if (shouldRouteToCallback(location.pathname)) {
    markCallbackConsumed()
    return <Navigate to={AUTH_CALLBACK_PATH} replace />
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      {/* Backward-compatible alias for older recovery redirect URLs. */}
      <Route
        path="/reset-password"
        element={<Navigate to="/set-password" replace />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route
            path="/applications/:id/tailor/:versionId"
            element={<TailorPage />}
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
