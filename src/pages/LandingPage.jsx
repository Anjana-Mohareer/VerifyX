import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./LandingPage.css";

const journey = [
  ["01", "Create Profile", "Candidate registration, role selection and secure account verification."],
  ["02", "Build Background", "Education, current employer and previous employer details in one guided flow."],
  ["03", "Upload Evidence", "Identity, academic and employment documents attached to the candidate profile."],
  ["04", "HR Verification", "Review, approve, reject, re-upload and track the complete verification trail."],
];

export default function LandingPage() {
  return <>
    <Navbar />
    <main className="vx-landing">
      <section className="vx-hero">
        <div className="vx-ambient vx-a1"/><div className="vx-ambient vx-a2"/>
        <div className="vx-hero-copy page-enter">
          <div className="vx-eyebrow"><span className="vx-live-dot"/> Smart Candidate Verification Platform</div>
          <h1>From Application To <span>Verified Confidence.</span></h1>
          <p>Verify-X brings Candidate Onboarding, Education and Employment Details, Document Intelligence and HR Verification into one polished workflow.</p>
          <div className="vx-login-choice">
            <Link to="/candidate-login" className="vx-login-card candidate-choice">
              <span className="vx-choice-icon">C</span><div><small>For Applicants</small><b>Candidate Login</b><em>Build and Track your Verified Profile →</em></div>
            </Link>
            <Link to="/admin-login" className="vx-login-card hr-choice">
              <span className="vx-choice-icon">H</span><div><small>For Verification Teams</small><b>HR Login</b><em>Review and manage candidate checks →</em></div>
            </Link>
          </div>
          <div className="vx-trust-row"><span>✓ Guided onboarding</span><span>✓ Smart Document Extraction</span><span>✓ Local workflow persistence</span></div>
        </div>

        <div className="vx-hero-visual page-enter">
          <div className="vx-dashboard-preview">
            <div className="vx-preview-top"><div><span/><span/><span/></div><b>Candidate Verification</b><small>Live workflow</small></div>
            <div className="vx-score-ring"><div><strong>92</strong><span>Verification Score</span></div></div>
            <div className="vx-preview-grid">
              <article><small>Identity</small><b>Verified</b><span>✓ Aadhaar & PAN</span></article>
              <article><small>Education</small><b>Extracted</b><span>↗ Smart Marksheet Fill</span></article>
              <article><small>Employment</small><b>In Review</b><span>◷ Current + Previous</span></article>
              <article><small>Documents</small><b>8 / 10</b><span>Secure Uploads</span></article>
            </div>
            <div className="vx-floating-card vx-float-one"><i>✓</i><div><b>Profile Matched</b><small>Candidate information synced</small></div></div>
            <div className="vx-floating-card vx-float-two"><i>AI</i><div><b>Document Intelligence</b><small>Auto-fill ready</small></div></div>
          </div>
        </div>
      </section>

      <section className="vx-strip"><span>Candidate Onboarding</span><i>•</i><span>Education Verification</span><i>•</i><span>Employment History</span><i>•</i><span>Document Review</span><i>•</i><span>HR Decision</span></section>

      <section className="vx-section vx-journey">
        <div className="vx-section-heading"><span>How Verify-X Works</span><h2>A verification Journey that Feels Simple.</h2><p>Every step is structured so candidates know what to do next and HR teams get cleaner, review-ready information.</p></div>
        <div className="vx-journey-grid">{journey.map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
      </section>

      <section className="vx-section vx-intelligence">
        <div className="vx-intelligence-card"><div className="vx-doc-stack"><div className="vx-paper p1">10th Marksheet</div><div className="vx-paper p2">Education Data</div><div className="vx-paper p3">Auto-filled ✓</div></div><div><span className="vx-eyebrow">Document Intelligence</span><h2>Upload once. Fill smarter.</h2><p>The new onboarding flow can use document extraction to populate supported fields from academic documents, reducing repeated typing and helping candidates review information before submission.</p><div className="vx-mini-features"><span>Board & School</span><span>Roll Number</span><span>Passing Year</span><span>Percentage</span></div></div></div>
      </section>

      <section className="vx-cta"><div><span>Ready to continue?</span><h2>Choose your Verify-X workspace.</h2></div><div><Link to="/candidate-login" className="btn primary">Candidate Login</Link><Link to="/admin-login" className="btn dark">HR Login</Link></div></section>
    </main>
    <Footer />
  </>;
}
