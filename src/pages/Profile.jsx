import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/useAuth";
import { getHrProfile, saveHrProfile } from "../services/storage";

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Profile() {
  const { session, refresh } = useAuth();
  const isCandidate = session?.type === "CANDIDATE";
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [profile, setProfile] = useState({ name: "HR", phone: "", email: session?.email || "" });

  useEffect(() => {
    if (!isCandidate) {
      const saved = getHrProfile();
      setProfile({
        name: saved.name || session?.name || "HR",
        phone: saved.phone || "",
        email: saved.email || session?.email || "",
      });
    }
  }, [isCandidate, session?.email, session?.name]);

  const change = (key, value) => {
    let nextValue = value;
    if (key === "name") nextValue = value.replace(/[^a-zA-Z .'-]/g, "").slice(0, 50);
    if (key === "phone") nextValue = value.replace(/\D/g, "").slice(0, 10);
    setProfile((current) => ({ ...current, [key]: nextValue }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setMessage("");
  };

  const save = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!profile.name.trim() || profile.name.trim().length < 2) nextErrors.name = "Enter a valid HR name.";
    if (!PHONE_PATTERN.test(profile.phone)) nextErrors.phone = "Enter a valid 10-digit mobile number.";
    if (!EMAIL_PATTERN.test(profile.email.trim())) nextErrors.email = "Enter a valid email address.";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    saveHrProfile({
      name: profile.name.trim(),
      phone: profile.phone,
      email: profile.email.trim().toLowerCase(),
    });
    refresh();
    setEditing(false);
    setMessage("HR profile updated successfully.");
  };

  if (isCandidate) {
    const displayName = session?.name || "Candidate";
    return (
      <div className="app">
        <Sidebar type={session?.type} />
        <main className="content">
          <h1>Profile</h1>
          <section className="panel profile-panel">
            <div className="avatar">{displayName[0]}</div>
            <h2>{displayName}</h2>
            <p><b>Email:</b> {session?.email}</p>
            <p><b>Role:</b> Candidate</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar type={session?.type} />
      <main className="content">
        <div className="page-title-row">
          <div>
            <h1>HR Profile</h1>
            <p className="muted">Manage your HR contact information.</p>
          </div>
          {!editing && (
            <button className="btn primary" onClick={() => { setEditing(true); setMessage(""); }}>
              Edit Profile
            </button>
          )}
        </div>

        <section className="panel profile-panel hr-profile-panel">
          <div className="avatar">{profile.name?.[0]?.toUpperCase() || "H"}</div>

          {message && <div className="profile-success">{message}</div>}

          {editing ? (
            <form className="hr-profile-form" onSubmit={save} noValidate>
              <label>
                HR Name
                <input value={profile.name} onChange={(e) => change("name", e.target.value)} placeholder="Enter HR name" />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </label>

              <label>
                Mobile Number
                <input type="tel" inputMode="numeric" value={profile.phone} onChange={(e) => change("phone", e.target.value)} placeholder="Enter 10-digit mobile number" />
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </label>

              <label>
                Email ID
                <input type="email" value={profile.email} onChange={(e) => change("email", e.target.value)} placeholder="Enter email address" />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </label>

              <div className="actions">
                <button type="button" className="btn" onClick={() => { setEditing(false); setErrors({}); const saved = getHrProfile(); setProfile({ name: saved.name || "HR", phone: saved.phone || "", email: saved.email || session?.email || "" }); }}>
                  Cancel
                </button>
                <button type="submit" className="btn primary">Save Changes</button>
              </div>
            </form>
          ) : (
            <div className="profile-details-grid">
              <div><span>Name</span><strong>{profile.name || "HR"}</strong></div>
              <div><span>Mobile Number</span><strong>{profile.phone || "Not added"}</strong></div>
              <div><span>Email ID</span><strong>{profile.email}</strong></div>
              <div><span>Role</span><strong>HR</strong></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
