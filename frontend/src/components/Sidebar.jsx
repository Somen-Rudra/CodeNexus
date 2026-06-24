import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MdDashboard, MdCode, MdEmojiEvents, MdBusiness, MdMessage,
  MdAutoAwesome, MdBookmark, MdBarChart, MdWorkspacePremium,
  MdSearch, MdMenu, MdMenuOpen,
} from "react-icons/md";
import { FaPaperPlane } from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";
import ProfilePopup from "./ProfilePopup";
import { useAuth } from "../context/AuthContext";
import "../styles/sidebar.css";

export const routeMap = {
  dashboard:    { label: "Dashboard",   path: "/",            icon: MdDashboard        },
  problems:     { label: "Problems",    path: "/problemSet",  icon: MdCode             },
  contests:     { label: "Contests",    path: "/contests",    icon: MdEmojiEvents      },
  companies:    { label: "Companies",   path: "/companies",   icon: MdBusiness         },
  interviews:   { label: "Interviews",  path: "/interviews",  icon: MdMessage          },
  aiFeatures:   { label: "AI Features", path: "/ai-features", icon: MdAutoAwesome      },
  bookmarks:    { label: "Bookmarks",   path: "/bookmarks",   icon: MdBookmark         },
  progress:     { label: "Progress",    path: "/progress",    icon: MdBarChart         },
  certificates: { label: "Certificates",path: "/certificates",icon: MdWorkspacePremium },
  submissions:  { label: "Submissions", path: "/submissions", icon: FaPaperPlane },
};

const BOTTOM_KEYS = [];

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 360;
const COLLAPSE_THRESHOLD = 100;

export default function Sidebar({ routes = routeMap }) {
  const location   = useLocation();
  const { user }   = useAuth();                 // ← dynamic user
  const [collapsed,  setCollapsed]  = useState(false);
  const [width,      setWidth]      = useState(220);
  const [showPopup,  setShowPopup]  = useState(false);
  const avatarRef   = useRef(null);
  const isResizing  = useRef(false);
  const sidebarRef  = useRef(null);

  const topRoutes    = Object.entries(routes).filter(([k]) => !BOTTOM_KEYS.includes(k));
  const bottomRoutes = Object.entries(routes).filter(([k]) =>  BOTTOM_KEYS.includes(k));

  const startResize = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";

    if (sidebarRef.current) sidebarRef.current.style.transition = "none";

    const onMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      if (newWidth < COLLAPSE_THRESHOLD) {
        setCollapsed(true);
        setWidth(220);
      } else {
        setCollapsed(false);
        setWidth(Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH));
      }
    };

    const onUp = () => {
      isResizing.current = false;
      document.body.style.cursor    = "";
      document.body.style.userSelect = "";
      if (sidebarRef.current) sidebarRef.current.style.transition = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }, []);

  const initials  = user ? getInitials(user.name) : "?";
  const isPremium = user?.isPremium ?? false;

  return (
    <aside
      ref={sidebarRef}
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
      style={!collapsed ? { width, minWidth: width } : undefined}
    >
      {/* ── Header ── */}
      <div className="sidebar__header">
        {!collapsed && (
          <Link to="/" className="sidebar__brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="sidebar__brand-name">CodeNexus</span>
          </Link>
        )}
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <MdMenuOpen size={20} /> : <MdMenu size={20} />}
        </button>
      </div>

      {/* ── Search ── */}
      {!collapsed ? (
        <div className="sidebar__search">
          <MdSearch className="sidebar__search-icon" size={16} />
          <input type="text" placeholder="Search…" className="sidebar__search-input" />
        </div>
      ) : (
        <button className="sidebar__icon-btn" title="Search">
          <MdSearch size={20} />
        </button>
      )}

      {/* ── Top nav ── */}
      <nav className="sidebar__nav">
        {topRoutes.map(([key, route]) => {
          const active = location.pathname === route.path;
          const Icon   = route.icon;
          return (
            <Link
              key={key}
              to={route.path}
              data-label={route.label}
              className={`sidebar__link ${active ? "sidebar__link--active" : ""}`}
              title={collapsed ? route.label : undefined}
            >
              <Icon size={18} className="sidebar__link-icon" />
              {!collapsed && <span className="sidebar__link-label">{route.label}</span>}
              {!collapsed && active && <span className="sidebar__link-dot" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar__spacer" />

      {/* ── Upgrade card (hide for premium users) ── */}
      {!collapsed && !isPremium && (
        <div className="sidebar__upgrade">
          <div className="sidebar__upgrade-label">
            <MdAutoAwesome size={14} /> Pro plan
          </div>
          <p className="sidebar__upgrade-desc">
            Unlock all AI features and premium problems.
          </p>
          <Link to="/pricing" className="sidebar__upgrade-btn">
            Upgrade Now
          </Link>
        </div>
      )}

      {/* ── Bottom ── */}
      <div className="sidebar__bottom">
        {bottomRoutes.map(([key, route]) => {
          const active = location.pathname === route.path;
          const Icon   = route.icon;
          return (
            <Link
              key={key}
              to={route.path}
              data-label={route.label}
              className={`sidebar__link ${active ? "sidebar__link--active" : ""}`}
              title={collapsed ? route.label : undefined}
            >
              <Icon size={18} className="sidebar__link-icon" />
              {!collapsed && <span className="sidebar__link-label">{route.label}</span>}
            </Link>
          );
        })}

        <div className={`sidebar__bottom-row ${collapsed ? "sidebar__bottom-row--col" : ""}`}>
          <ThemeToggle />

          <div className="sidebar__avatar-wrap">
            <button
              ref={avatarRef}
              className={`sidebar__avatar ${showPopup ? "sidebar__avatar--active" : ""}`}
              onClick={() => setShowPopup((v) => !v)}
              aria-label="Open profile menu"
              aria-expanded={showPopup}
            >
              {initials}
            </button>

            {showPopup && (
              <ProfilePopup
                onClose={() => setShowPopup(false)}
                anchorRef={avatarRef}
                collapsed={collapsed}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Resize handle ── */}
      <div
        className="sidebar__resize-handle"
        onMouseDown={startResize}
        aria-hidden="true"
      />
    </aside>
  );
}