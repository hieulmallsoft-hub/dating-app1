import React, { useState } from "react";
import {
  CalendarDays,
  MapPin,
  Settings,
  User,
  Image as ImageIcon,
  MessageCircle,
  Bell,
  Sparkles,
  Route,
  Wrench,
} from "lucide-react";
import AlbumPanel from "./AlbumPanel";
import ChatPanel from "./ChatPanel";
import CouplePanel from "./CouplePanel";
import EventsPanel from "./EventsPanel";
import MomentsPanel from "./MomentsPanel";
import NotificationsPanel from "./NotificationsPanel";
import PlacesPanel from "./PlacesPanel";
import ProfilePanel from "./ProfilePanel";
import TripsPanel from "./TripsPanel";
import OpsPanel from "./OpsPanel";

type Tab =
  | "events"
  | "moments"
  | "trips"
  | "places"
  | "chat"
  | "notifications"
  | "album"
  | "ops"
  | "profile";

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
        {tab === "moments" ? <MomentsPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "trips" ? <TripsPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "places" ? <PlacesPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "album" ? <AlbumPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "chat" ? <ChatPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "notifications" ? <NotificationsPanel onAuthInvalid={onAuthInvalid} /> : null}
        {tab === "ops" ? <OpsPanel onAuthInvalid={onAuthInvalid} /> : null}

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
          className={`nav-item ${tab === "places" ? "active" : ""}`}
          onClick={() => setTab("places")}
          type="button"
        >
          <MapPin size={24} />
        </button>
        <button
          className={`nav-item ${tab === "moments" ? "active" : ""}`}
          onClick={() => setTab("moments")}
          type="button"
        >
          <Sparkles size={24} />
        </button>
        <button
          className={`nav-item ${tab === "trips" ? "active" : ""}`}
          onClick={() => setTab("trips")}
          type="button"
        >
          <Route size={24} />
        </button>
        <button
          className={`nav-item ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
          type="button"
        >
          <MessageCircle size={24} />
        </button>
        <button
          className={`nav-item ${tab === "notifications" ? "active" : ""}`}
          onClick={() => setTab("notifications")}
          type="button"
        >
          <Bell size={24} />
        </button>
        <button
          className={`nav-item ${tab === "album" ? "active" : ""}`}
          onClick={() => setTab("album")}
          type="button"
        >
          <ImageIcon size={24} />
        </button>
        <button
          className={`nav-item ${tab === "ops" ? "active" : ""}`}
          onClick={() => setTab("ops")}
          type="button"
        >
          <Wrench size={24} />
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
