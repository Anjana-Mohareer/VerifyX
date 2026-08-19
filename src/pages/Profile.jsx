import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/useAuth";
import { getHrProfile, saveHrProfile } from "../services/storage";
import { api } from "../services/apiService";

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyHrProfile = (session = {}) => ({
  name: session.name || "HR Admin",
  role: session.role || "HR Admin",
  designation: session.designation || "HR Professional",
  company: session.company || "",
  employeeId: session.employeeId || "",
  department: session.department || "Human Resources",
  location: session.location || "",
  joiningDate: session.joiningDate || "",
  phone: session.phone || "",
  email: session.email || "",
  reportingManager: session.reportingManager || "",
  workMode: session.workMode || "Onsite",
  photo: session.photo || "",
  status: "Active",
  lastLoginAt: session.lastLoginAt || "",
});

const formatLastLogin = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

export default function Profile() {
  const { session, refresh } = useAuth();
  const isCandidate = session?.type === "CANDIDATE";
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [profile, setProfile] = useState(emptyHrProfile(session));
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (isCandidate) {
      let currentUrl = "";
      api.profilePhotoBlob().then((blob) => { currentUrl = URL.createObjectURL(blob); setPhotoUrl(currentUrl); }).catch(() => setPhotoUrl(""));
      return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
    }
    const saved = getHrProfile();
    setProfile(emptyHrProfile(saved));
  }, [isCandidate, session?.email, session?.name, session?.lastLoginAt]);

  const uploadHrPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Please choose a JPG, PNG or WEBP image.");
    if (file.size > 2 * 1024 * 1024) return setMessage("Profile photo must be 2 MB or smaller.");
    setPhotoBusy(true);
    setMessage("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setProfile((current) => ({ ...current, photo: dataUrl }));
      const updated = saveHrProfile({ photo: dataUrl });
      setProfile(emptyHrProfile(updated));
      refresh();
      setPhotoBusy(false);
      setMessage("Profile photo updated successfully.");
    };
    reader.onerror = () => {
      setPhotoBusy(false);
      setMessage("Unable to read the selected image. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const removeHrPhoto = () => {
    const updated = saveHrProfile({ photo: "" });
    setProfile(emptyHrProfile(updated));
    refresh();
    setMessage("Profile photo removed.");
  };

  const change = (key, value) => {
    let nextValue = value;
    if (["name", "role", "designation", "company", "employeeId", "department", "location"].includes(key)) {
      nextValue = value.slice(0, 100);
    }
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
    if (!profile.role.trim()) nextErrors.role = "Enter an HR role.";
    if (!profile.designation.trim()) nextErrors.designation = "Enter a designation.";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }

    const updated = saveHrProfile({
      ...profile,
      name: profile.name.trim(), role: profile.role.trim(), designation: profile.designation.trim(),
      company: profile.company.trim(), employeeId: profile.employeeId.trim(), department: profile.department.trim(),
      location: profile.location.trim(), joiningDate: profile.joiningDate, phone: profile.phone,
      email: profile.email.trim().toLowerCase(), reportingManager: profile.reportingManager.trim(),
      workMode: profile.workMode, status: "Active",
    });
    setProfile(emptyHrProfile(updated));
    refresh();
    setEditing(false);
    setMessage("HR profile updated successfully.");
  };

  if (isCandidate) {
    const displayName = session?.name || "Candidate";
    const uploadPhoto = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return setMessage("Please choose a JPG, PNG or WEBP image.");
      if (file.size > 5 * 1024 * 1024) return setMessage("Profile photo must be 5 MB or smaller.");
      try {
        setPhotoBusy(true); setMessage("");
        const form = new FormData(); form.append("photo", file);
        await api.uploadProfilePhoto(form);
        const blob = await api.profilePhotoBlob();
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        setPhotoUrl(URL.createObjectURL(blob));
        setMessage("Profile photo updated successfully.");
      } catch (error) { setMessage(error.message || "Unable to update profile photo."); }
      finally { setPhotoBusy(false); }
    };
    return (
      <div className="app"><Sidebar type={session?.type} /><main className="content candidate-profile-page">
        <div className="page-title-row"><div><h1>My Profile</h1><p className="muted">Personalize your verified candidate identity.</p></div></div>
        <section className="panel profile-panel candidate-profile-card"><div className="candidate-photo-wrap">
          {photoUrl ? <img src={photoUrl} className="candidate-profile-photo" alt={displayName} /> : <div className="avatar candidate-photo-fallback">{displayName[0]?.toUpperCase()}</div>}
          <label className="btn primary photo-upload-btn">{photoBusy ? "Uploading..." : "Change Photo"}<input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={photoBusy} onChange={uploadPhoto} /></label>
        </div>
        {message && <div className="profile-success">{message}</div>}
        <div className="profile-details-grid candidate-profile-details"><div><span>Candidate Name</span><strong>{displayName}</strong></div><div><span>Email ID</span><strong>{session?.email}</strong></div><div><span>Candidate Type</span><strong>{String(session?.candidateType || "Candidate").replaceAll("_", " ")}</strong></div><div><span>Account</span><strong className="verified-text">✓ Email Verified</strong></div></div></section>
      </main></div>
    );
  }

  const cancelEdit = () => {
    setEditing(false); setErrors({}); setMessage(""); setProfile(emptyHrProfile(getHrProfile()));
  };

  return (
    <div className="app">
      <Sidebar type={session?.type} />
      <main className="content">
        <div className="page-title-row">
          <div><h1>HR Profile</h1><p className="muted">Manage your HR identity and professional information.</p></div>
          {!editing && <button className="btn primary" onClick={() => { setEditing(true); setMessage(""); }}>Edit Profile</button>}
        </div>

        <section className="panel profile-panel hr-profile-panel hr-profile-modern">
          <div className="hr-profile-hero">
            <div className="hr-profile-photo-wrap">
              {profile.photo ? (
                <img src={profile.photo} className="hr-profile-photo" alt={profile.name || "HR Admin"} />
              ) : (
                <div className="avatar hr-profile-avatar">{profile.name?.[0]?.toUpperCase() || "H"}</div>
              )}
              <label className="btn hr-photo-upload-btn">
                {photoBusy ? "Uploading..." : profile.photo ? "Change Photo" : "Add Photo"}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={photoBusy} onChange={uploadHrPhoto} />
              </label>
              {profile.photo && (
                <button type="button" className="btn hr-photo-remove-btn" disabled={photoBusy} onClick={removeHrPhoto}>
                  Remove Photo
                </button>
              )}
            </div>
            <div className="hr-profile-identity">
              <h2>{profile.name || "HR Admin"}</h2>
              <p>{profile.role || "HR Admin"}</p>
              <span>{profile.designation || "HR Professional"}</span>
              <div className="hr-status-pill"><i /> Active</div>
            </div>
          </div>

          {message && <div className="profile-success">{message}</div>}

          {editing ? (
            <form className="hr-profile-form hr-profile-edit-form" onSubmit={save} noValidate>
              <div className="hr-profile-section-title">Profile Information</div>
              <label>Full Name<input value={profile.name} onChange={(e) => change("name", e.target.value)} placeholder="Enter full name" />{errors.name && <span className="field-error">{errors.name}</span>}</label>
              <label>HR Role<input value={profile.role} onChange={(e) => change("role", e.target.value)} placeholder="e.g. HR Admin" />{errors.role && <span className="field-error">{errors.role}</span>}</label>
              <label>Designation<input value={profile.designation} onChange={(e) => change("designation", e.target.value)} placeholder="e.g. HR Professional" />{errors.designation && <span className="field-error">{errors.designation}</span>}</label>
              <label>Company<input value={profile.company} onChange={(e) => change("company", e.target.value)} placeholder="Company not added" /></label>
              <label>Employee ID<input value={profile.employeeId} onChange={(e) => change("employeeId", e.target.value)} placeholder="Employee ID (optional)" /></label>
              <label>Department<input value={profile.department} onChange={(e) => change("department", e.target.value)} placeholder="Human Resources" /></label>
              <label>Location<input value={profile.location} onChange={(e) => change("location", e.target.value)} placeholder="Location not added" /></label>
              <label>Reporting Manager<input value={profile.reportingManager} onChange={(e) => change("reportingManager", e.target.value)} placeholder="Reporting manager not added" /></label>
              <label>Work Mode<select value={profile.workMode} onChange={(e) => change("workMode", e.target.value)}><option value="Onsite">Onsite</option><option value="Remote">Remote</option><option value="Hybrid">Hybrid</option></select></label>
              <label>Joining Date<input type="date" value={profile.joiningDate} onChange={(e) => change("joiningDate", e.target.value)} /></label>
              <label>Mobile Number<input type="tel" inputMode="numeric" value={profile.phone} onChange={(e) => change("phone", e.target.value)} placeholder="Enter 10-digit mobile number" />{errors.phone && <span className="field-error">{errors.phone}</span>}</label>
              <label>Email ID<input type="email" value={profile.email} onChange={(e) => change("email", e.target.value)} placeholder="Enter email address" />{errors.email && <span className="field-error">{errors.email}</span>}</label>
              <div className="actions"><button type="button" className="btn" onClick={cancelEdit}>Cancel</button><button type="submit" className="btn primary">Save Changes</button></div>
            </form>
          ) : (
            <>
              <div className="hr-profile-section-title">Personal Information</div>
              <div className="profile-details-grid hr-profile-grid"><div><span>Full Name</span><strong>{profile.name || "Not added"}</strong></div><div><span>Email ID</span><strong>{profile.email || "Not added"}</strong></div><div><span>Mobile Number</span><strong>{profile.phone || "Not added"}</strong></div><div><span>Location</span><strong>{profile.location || "Not added"}</strong></div></div>
              <div className="hr-profile-section-title">Professional Information</div>
              <div className="profile-details-grid hr-profile-grid"><div><span>HR Role</span><strong>{profile.role || "HR Admin"}</strong></div><div><span>Designation</span><strong>{profile.designation || "HR Professional"}</strong></div><div><span>Company</span><strong>{profile.company || "Company not added"}</strong></div><div><span>Employee ID</span><strong>{profile.employeeId || "Not added"}</strong></div><div><span>Department</span><strong>{profile.department || "Human Resources"}</strong></div><div><span>Reporting Manager</span><strong>{profile.reportingManager || "Not added"}</strong></div><div><span>Work Mode</span><strong>{profile.workMode || "Onsite"}</strong></div><div><span>Joining Date</span><strong>{profile.joiningDate ? new Date(`${profile.joiningDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not added"}</strong></div></div>
              <div className="hr-profile-section-title">Account & Security</div>
              <div className="profile-details-grid hr-profile-grid"><div><span>Account Status</span><strong className="active-profile-text">● Active</strong></div><div><span>Last Login</span><strong>{formatLastLogin(profile.lastLoginAt)}</strong></div></div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
