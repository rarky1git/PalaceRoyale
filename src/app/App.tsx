import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { AddToHomeScreenModal } from './components/AddToHomeScreenModal';
import { APP_VERSION } from './pages/WhatsNewPage';

export default function App() {
  useEffect(() => {
    try { localStorage.setItem('palace-version', APP_VERSION); } catch { /* ignore */ }
  }, []);

  return (
    <SettingsProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <AddToHomeScreenModal />
      </AuthProvider>
    </SettingsProvider>
  );
}
