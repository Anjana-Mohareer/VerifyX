import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { MODULES } from "../utils/constants";

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main className="landing landing-modern">
        <section className="hero hero-modern">
          <div className="hero-copy">
            <span className="pill landing-pill">Enterprise HR Verification</span>

            <h1>
              Turn every document into a trusted decision
            </h1>

            <p>
              Verify-X helps HR teams manage fresher and experienced candidate
              onboarding with secure document upload, real-time verification
              status, automated reports, and audit-ready records.
            </p>

            <div className="hero-actions landing-actions">
              <Link className="btn primary landing-primary" to="/candidate-register">
                Candidate Registration
              </Link>

              <Link className="btn dark landing-dark" to="/admin-login">
                HR Login
              </Link>
            </div>
          </div>

          <div className="hero-card module-card">
            <h2>Module Structure</h2>

            <div className="status-grid module-grid">
              {MODULES.map((m) => (
                <b key={m}>{m}</b>
              ))}
            </div>
          </div>
        </section>

        <section className="features landing-features">
          <article>
            <h3>Candidate Portal</h3>
            <p>
              Capture candidate details, employment type, identity numbers,
              skills and document upload in a structured workflow.
            </p>
          </article>

          <article>
            <h3>Verification Workflow</h3>
            <p>
              HR can verify UAN, review documents, approve, reject or request
              re-upload with remarks.
            </p>
          </article>

          <article>
            <h3>Reports</h3>
            <p>
              Track candidates, verification progress and document status from
              the admin dashboard.
            </p>
          </article>
        </section>
      </main>

      <Footer />
    </>
  );
}
