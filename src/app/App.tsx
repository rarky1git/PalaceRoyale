import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SettingsProvider } from './contexts/SettingsContext';
import { AddToHomeScreenModal } from './components/AddToHomeScreenModal';

export default function App() {
  return (
    <SettingsProvider>
      <RouterProvider router={router} />
      <AddToHomeScreenModal />
    </SettingsProvider>
  );
}
