import type { ReactNode } from 'react';
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import './App.css';

import LoginPage from './pages/LoginPage';
import CardPage from './pages/CardPage';
import { getSession } from './utils/session';

// Only shows its page to a logged-in user; everyone else goes to the login page
function RequireLogin({ children }: { children: ReactNode }) {
  return getSession() ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/cards" element={<RequireLogin><CardPage /></RequireLogin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
