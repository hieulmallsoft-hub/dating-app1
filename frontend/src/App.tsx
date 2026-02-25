import React, { useState, useEffect } from 'react';
import { Apple, Heart } from 'lucide-react';
import './App.css';
import Home from './components/Home';

const App: React.FC = () => {
  const BACKEND_URL = 'http://127.0.0.1:3001';
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check for simulation flag or REAL tokens in URL
  useEffect(() => {
    // 1. Check for real tokens in URL (after redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('fzi_access_token', accessToken);
      localStorage.setItem('fzi_refresh_token', refreshToken);
      localStorage.setItem('fzi_logged_in', 'true');
      setIsLoggedIn(true);
      
      // Clear URL params for a clean look
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // 2. Check for simulation flag
    if (localStorage.getItem('fzi_logged_in') === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleGoogleLogin = () => {
    // Redirec to backend Google auth endpoint
    // Correcting from /callback back to the main auth route
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  const handleAppleLogin = () => {
    // Redirect to backend Apple auth endpoint
    // Correcting from /callback back to the main auth route
    window.location.href = `${BACKEND_URL}/auth/apple`;
  };

  const simulateLogin = () => {
    localStorage.setItem('fzi_logged_in', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('fzi_logged_in');
    setIsLoggedIn(false);
  };

  if (isLoggedIn) {
    return <Home onLogout={handleLogout} />;
  }

  return (
    <div className="screen">
      <div className="mascot-container" onClick={simulateLogin} style={{ cursor: 'pointer' }}>
        <Heart size={120} color="#FF4D80" fill="#FF4D80" />
      </div>

      <h1>Where's my love?</h1>
      <p><span className="highlight">Fozi</span> knows</p>

      <div className="button-group">
        <button className="btn btn-apple" onClick={handleAppleLogin}>
          <Apple className="btn-icon" />
          Tiếp tục với Apple
        </button>
        
        <button className="btn btn-google" onClick={handleGoogleLogin}>
          <svg className="btn-icon" viewBox="0 0 24 24">
            {/* Google SVG paths */}
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Tiếp tục với Google
        </button>
      </div>

      <div className="footer-text">
        Đã có tài khoản? <span className="highlight">Đăng nhập ngay</span>
      </div>
      <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '1rem' }}>
        Tip: Click vào trái tim để xem thử giao diện App chính!
      </p>
    </div>
  );
};

export default App;
