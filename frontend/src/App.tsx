import React from 'react';
import { Apple, Chrome, Heart } from 'lucide-react';
import './App.css';

const App: React.FC = () => {
  const handleGoogleLogin = () => {
    // Redirect to backend Google auth endpoint
    window.location.href = 'http://127.0.0.1:3000/auth/google';
  };

  const handleAppleLogin = () => {
    // Redirect to backend Apple auth endpoint
    window.location.href = 'http://127.0.0.1:3000/auth/apple';
  };

  return (
    <div className="screen">
      <div className="mascot-container">
        <Heart size={120} color="#FF4D80" fill="#FF4D80" />
      </div>

      <h1>Where's my love?</h1>
      <p><span className="highlight">Fozi</span> knows</p>

      <div className="button-group">
        <button className="btn btn-apple" onClick={handleAppleLogin}>
          <Apple className="btn-icon" />
          Login with Apple
        </button>
        
        <button className="btn btn-google" onClick={handleGoogleLogin}>
          <Chrome className="btn-icon" />
          Login with Google
        </button>
      </div>
    </div>
  );
};

export default App;
