import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import RegisterMatch from './pages/RegisterMatch';
import PlayerProfile from './pages/PlayerProfile';
import HeadToHead from './pages/HeadToHead';
import MatchHistory from './pages/MatchHistory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="players" element={<Players />} />
          <Route path="players/:id" element={<PlayerProfile />} />
          <Route path="register" element={<RegisterMatch />} />
          <Route path="h2h" element={<HeadToHead />} />
          <Route path="history" element={<MatchHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
