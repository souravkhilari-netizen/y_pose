import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PoseSelectionPage from './pages/PoseSelectionPage';
import PracticePage from './pages/PracticePage';

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/poses" element={<PoseSelectionPage />} />
          <Route path="/practice/:poseId" element={<PracticePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
