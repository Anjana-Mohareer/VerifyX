import { Link } from "react-router-dom";
import logo from "../assets/verify-x-full-logo.png";

export default function Navbar() {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <img src={logo} alt="Verify-X" className="navbar-logo" />
      </Link>

      <nav>
        <Link className="btn ghost" to="/candidate-login">Candidate Login</Link>
        <Link className="btn ghost" to="/candidate-register">Register</Link>
        <Link className="btn primary" to="/admin-login">HR Login</Link>
      </nav>
    </header>
  );
}