import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SettingsProvider } from './contexts/SettingsContext';
import { AddToHomeScreenModal } from './components/AddToHomeScreenModal';
import { APP_VERSION } from './pages/WhatsNewPage';

export default function App() {
  useEffect(() => {
    try { localStorage.setItem('palace-version', APP_VERSION); } catch { /* ignore */ }
  }, []);

  return (
    <SettingsProvider>
      <RouterProvider router={router} />
      <AddToHomeScreenModal />
    </SettingsProvider>
  );
}
