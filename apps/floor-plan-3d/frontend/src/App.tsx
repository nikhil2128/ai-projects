import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Box, History } from 'lucide-react';
import AnalyzePage from './pages/AnalyzePage';
import HistoryPage from './pages/HistoryPage';
import HistoryDetailPage from './pages/HistoryDetailPage';

export default function App() {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">FloorViz</h1>
            <p className="text-xs text-gray-500">2D Floor Plan → 3D Model</p>
          </div>
        </NavLink>

        <nav className="ml-auto flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            Analyze
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <History className="w-3.5 h-3.5" />
            History
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<AnalyzePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
