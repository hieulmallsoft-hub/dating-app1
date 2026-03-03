import React, { useState } from "react";
import {
  CalendarDays,
  Settings,
  User,
  Image as ImageIcon,
  MessageCircle,
} from "lucide-react";
import AlbumPanel from "./AlbumPanel";
import ChatPanel from "./ChatPanel";
import CouplePanel from "./CouplePanel";
import EventsPanel from "./EventsPanel";
import ProfilePanel from "./ProfilePanel";
type Tab = "events" | "chat" | "album" | "profile";

type Props = {
  onLogout: () => void;
  onAuthInvalid: () => void;
};

const Home: React.FC<Props> = ({ onLogout, onAuthInvalid }) => {
  const [tab, setTab] = useState<Tab>("events");

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
        {tab === "events" ? <EventsPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "album" ? <AlbumPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "chat" ? <ChatPanel onAuthInvalid={onAuthInvalid} /> : null}

        {tab === "profile" ? (
          <div className="panel-stack">
            <CouplePanel onAuthInvalid={onAuthInvalid} />
            <ProfilePanel onLogout={onLogout} onAuthInvalid={onAuthInvalid} />
          </div>
        ) : null}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-item ${tab === "events" ? "active" : ""}`}
          onClick={() => setTab("events")}
          type="button"
        >
          <CalendarDays size={24} />
        </button>
        <button
          className={`nav-item ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
          type="button"
        >
          <MessageCircle size={24} />
        </button>
        <button
          className={`nav-item ${tab === "album" ? "active" : ""}`}
          onClick={() => setTab("album")}
          type="button"
        >
          <ImageIcon size={24} />
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
