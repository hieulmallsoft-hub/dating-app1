import React, { useState } from "react";
import { Heart, Search, Settings, User, Image as ImageIcon } from "lucide-react";
import AlbumPanel from "./AlbumPanel";
import CouplePanel from "./CouplePanel";
import ProfilePanel from "./ProfilePanel";

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
      <h3>
        {name}, {age}
      </h3>
      <p>
        <Search size={14} /> {location}
      </p>
    </div>
    <div className="card-actions">
      <button className="action-btn circle-btn like-btn" type="button">
        <Heart fill="#FF4D80" color="#FF4D80" />
      </button>
    </div>
  </div>
);

type Tab = "feed" | "album" | "couple" | "profile";

type Props = {
  onLogout: () => void;
  onAuthInvalid: () => void;
};

const Home: React.FC<Props> = ({ onLogout, onAuthInvalid }) => {
  const [tab, setTab] = useState<Tab>("feed");

  const matches = [
    {
      name: "Thao",
      age: 22,
      location: "Ha Noi",
      image:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80",
    },
    {
      name: "Linh",
      age: 24,
      location: "TP. HCM",
      image:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=80",
    },
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <h2 className="logo-text">Fozi</h2>
        <button
          className="icon-btn"
          onClick={() => setTab("profile")}
          type="button"
        >
          <Settings size={24} />
        </button>
      </header>

      <main className="feed">
        {tab === "feed" ? (
          <>
            <div className="section-title">
              <span>Danh cho ban</span>
              <p>Dua tren so thich cua ban</p>
            </div>

            <div className="matches-grid">
              {matches.map((match, idx) => (
                <MatchCard key={idx} {...match} />
              ))}
            </div>
          </>
        ) : null}

        {tab === "couple" ? <CouplePanel onAuthInvalid={onAuthInvalid} /> : null}

        {tab === "album" ? <AlbumPanel onAuthInvalid={onAuthInvalid} /> : null}

        {tab === "profile" ? (
          <ProfilePanel onLogout={onLogout} onAuthInvalid={onAuthInvalid} />
        ) : null}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-item ${tab === "feed" ? "active" : ""}`}
          onClick={() => setTab("feed")}
          type="button"
        >
          <Search size={24} />
        </button>
        <button
          className={`nav-item ${tab === "album" ? "active" : ""}`}
          onClick={() => setTab("album")}
          type="button"
        >
          <ImageIcon size={24} />
        </button>
        <button
          className={`nav-item ${tab === "couple" ? "active" : ""}`}
          onClick={() => setTab("couple")}
          type="button"
        >
          <Heart size={24} />
        </button>
        <button
          className={`nav-item ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
          type="button"
        >
          <User size={24} />
        </button>
      </nav>
    </div>
  );
};

export default Home;
