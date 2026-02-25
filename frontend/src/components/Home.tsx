import React from 'react';
import { Heart, MessageCircle, User, Search, Settings } from 'lucide-react';

interface MatchProps {
  name: string;
  age: number;
  location: string;
  image: string;
}

const MatchCard: React.FC<MatchProps> = ({ name, age, location, image }) => (
  <div className="match-card">
    <img src={image} alt={name} className="match-image" />
    <div className="match-info">
      <h3>{name}, {age}</h3>
      <p><Search size={14} /> {location}</p>
    </div>
    <div className="card-actions">
      <button className="action-btn circle-btn like-btn"><Heart fill="#FF4D80" color="#FF4D80" /></button>
    </div>
  </div>
);

const Home: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const matches = [
    { name: 'Thảo', age: 22, location: 'Hà Nội', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80' },
    { name: 'Linh', age: 24, location: 'TP. HCM', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=80' },
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <h2 className="logo-text">Fozi</h2>
        <button className="icon-btn" onClick={onLogout}><Settings size={24} /></button>
      </header>

      <main className="feed">
        <div className="section-title">
          <span>Dành cho bạn</span>
          <p>Dựa trên sở thích của bạn</p>
        </div>

        <div className="matches-grid">
          {matches.map((match, idx) => (
            <MatchCard key={idx} {...match} />
          ))}
        </div>
      </main>

      <nav className="bottom-nav">
        <button className="nav-item active"><Search size={24} /></button>
        <button className="nav-item"><MessageCircle size={24} /></button>
        <button className="nav-item"><User size={24} /></button>
      </nav>
    </div>
  );
};

export default Home;
