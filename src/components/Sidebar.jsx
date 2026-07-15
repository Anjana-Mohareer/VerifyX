import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import logo from "../assets/verify-x-full-logo.png";

export default function Sidebar({ type }) {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  const role = type || session?.type;

  const admin = [
    ["/dashboard", "📊 Dashboard"],
    ["/employees", "👥 Candidates"],
    ["/verification", "✅ Verification"],
    ["/admin-documents", "📄 Documents"],
    ["/reports", "📈 Reports"],
    ["/profile", "🙍 Profile"],
  ];

  const cand = [
    ["/candidate", "🏠 My Portal"],
    ["/candidate-documents", "📤 Upload Documents"],
    ["/profile", "🙍 Profile"],
  ];

  const links = role === "CANDIDATE" ? cand : admin;

  return (
    <aside className="sidebar">
      <div className="side-logo">
        <img src={logo} alt="Verify-X" className="sidebar-logo" />
      </div>

      {links.map(([to, label]) => (
        <NavLink key={to} to={to}>
          {label}
        </NavLink>
      ))}

      <div className="side-footer">
        <small>{session?.name || "User"} • {role}</small>
        <button
          className="btn full"
          onClick={() => {
            logout();
            nav("/");
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}