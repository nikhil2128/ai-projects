import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RewardsProvider } from './context/RewardsContext';
import { Hub } from './pages/Hub';
import { AppPage } from './pages/AppPage';

export function App() {
  return (
    <BrowserRouter>
      <RewardsProvider>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/app/:appId" element={<AppPage />} />
        </Routes>
      </RewardsProvider>
    </BrowserRouter>
  );
}
