import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/profile-popup.css";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePopup({ onClose, anchorRef, collapsed }) {
  const { user, logout } = useAuth();
  const popupRef = useRef(null);
  const navigate = useNavigate();

  // Position popup relative to anchor
  useEffect(() => {
    if (!anchorRef?.current || !popupRef.current) return;

    const position = () => {
      const rect   = anchorRef.current.getBoundingClientRect();
      const popup  = popupRef.current;
      const popupH = popup.offsetHeight;
      const popupW = popup.offsetWidth;

      let left = rect.right + 8;
      let top  = rect.bottom - popupH;

      if (left + popupW > window.innerWidth) left = rect.left - popupW - 8;
      if (top < 8) top = 8;

      popup.style.left = `${left}px`;
      popup.style.top  = `${top}px`;
    };

    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [anchorRef, collapsed]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const go = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login");
  };

  const initials = getInitials(user?.name ?? "");
  const handle   = user?.email ? `@${user.email.split("@")[0]}` : "";

  return createPortal(
    <div ref={popupRef} className="prof-popup" style={{ position: "fixed", zIndex: 9999 }}>

      {/* Identity */}
      <div className="prof-popup__header">
        <div className="prof-popup__avatar">{initials}</div>
        <div className="prof-popup__info">
          <span className="prof-popup__name">{user?.name ?? "—"}</span>
          <span className="prof-popup__handle">{handle}</span>
        </div>
      </div>

      {/* Plan */}
      <div className="prof-popup__plan">
        <i className="ti ti-sparkles" aria-hidden="true" />
        {user?.isPremium ? "Premium" : "Free"} Plan
        {!user?.isPremium && (
          <Link to="/pricing" className="prof-popup__upgrade" onClick={onClose}>
            Upgrade
          </Link>
        )}
      </div>

      <div className="prof-popup__divider" />

      <div className="prof-popup__section">
        <button className="prof-popup__item" onClick={() => go("/profile")}>
          <i className="ti ti-user" aria-hidden="true" />
          View Profile
        </button>
        <button className="prof-popup__item" onClick={() => go("/submissions")}>
          <i className="ti ti-code" aria-hidden="true" />
          My Submissions
        </button>
        <button className="prof-popup__item" onClick={() => go("/dashboard")}>
          <i className="ti ti-chart-line" aria-hidden="true" />
          Dashboard
        </button>
        <button className="prof-popup__item" onClick={() => go("/ai-features")}>
          <i className="ti ti-sparkles" aria-hidden="true" />
          AI Features
        </button>
      </div>

      <div className="prof-popup__divider" />

      <div className="prof-popup__section">
        <button className="prof-popup__item" onClick={() => go("/settings")}>
          <i className="ti ti-settings" aria-hidden="true" />
          Settings
        </button>
        {user?.role === "admin" && (
          <button className="prof-popup__item" onClick={() => go("/admin")}>
            <i className="ti ti-shield" aria-hidden="true" />
            Admin Panel
          </button>
        )}
      </div>

      <div className="prof-popup__divider" />

      <div className="prof-popup__section">
        <button className="prof-popup__item prof-popup__item--danger" onClick={handleLogout}>
          <i className="ti ti-logout" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>,
    document.body,
  );
}