import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/doc/:docId" element={<EditorPage />} />
    </Routes>
  );
}
