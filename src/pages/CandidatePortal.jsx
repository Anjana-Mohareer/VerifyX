import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/useAuth";
import { allCandidates, findCandidate, updateCandidate } from "../services/employeeService";
import { SKILLS } from "../utils/constants";
import { REGEX, cleanPan, findDuplicateIdentity, onlyDigits, onlyLetters } from "../utils/validators";

export default function CandidatePortal() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [c, setC] = useState(null);

  useEffect(() => {
    const candidate = findCandidate(session.id);

    if (candidate) {
      setC({
        profileStep: 1,
        status: "Draft",
        candidateType: "Fresher",
        employmentStatus: "FRESHER",
        currentlyEmployed: "No",
        holdingOfferLetter: "No",
        ...candidate,
      });
    }
  }, [session.id]);

  if (!c) {
    return (
      <div className="app">
        <Sidebar type="CANDIDATE" />
        <main className="content">
          <section className="panel">
            <h2>Candidate data not found</h2>
          </section>
        </main>
      </div>
    );
  }

  const step = c.profileStep || 1;

  const set = (key, value) => {
    let safeValue = value;

    if (key === "fullName") safeValue = onlyLetters(value);
    if (key === "phone") safeValue = onlyDigits(value, 10);
    if (key === "pan") safeValue = cleanPan(value);
    if (key === "aadhaar") safeValue = onlyDigits(value, 12);
    if (key === "uan") safeValue = onlyDigits(value, 12);
    if (["passingYear", "experience", "lastCtc", "currentCtc", "offeredCtc"].includes(key)) {
      safeValue = String(value).replace(/[^0-9.]/g, "").slice(0, 12);
    }

    const updated = { ...c, [key]: safeValue };

    if (key === "uan") {
      updated.uanVerified = false;
      updated.uanVerifiedBy = "";
      updated.uanVerifiedAt = "";
    }

    if (key === "candidateType" && safeValue === "Fresher") {
      updated.employmentStatus = "FRESHER";
      updated.currentlyEmployed = "No";
    }

    if (key === "candidateType" && safeValue === "Experienced") {
      updated.employmentStatus =
        updated.employmentStatus === "FRESHER"
          ? "PREVIOUSLY_EMPLOYED"
          : updated.employmentStatus;
    }

    if (key === "currentlyEmployed") {
      updated.employmentStatus =
        safeValue === "Yes" ? "CURRENTLY_EMPLOYED" : "PREVIOUSLY_EMPLOYED";
    }

    setC(updated);
  };

  const toggleMultiValue = (key, value, checked) => {
    const existingValues = c[key] || [];
    set(
      key,
      checked
        ? [...existingValues, value]
        : existingValues.filter((item) => item !== value)
    );
  };

  const saveCandidate = (updated, message = "Application saved") => {
    updateCandidate(c.id, updated);
    setC(updated);
    alert(message);
  };

  const editApplication = () => {
    const updated = {
      ...c,
      profileStep: 1,
      status: "Draft",
    };

    updateCandidate(c.id, updated);
    setC(updated);
  };

  const viewApplication = () => {
    const updated = {
      ...c,
      profileStep: 5,
    };

    updateCandidate(c.id, updated);
    setC(updated);
  };

  const saveDraft = () => {
    saveCandidate(c, "Draft saved successfully.");
  };

  const goToStep = (nextStep) => {
    const updated = {
      ...c,
      profileStep: nextStep,
      status: c.status || "Draft",
      updatedAt: new Date().toISOString(),
    };

    updateCandidate(c.id, updated);
    setC(updated);
  };

  const showValidationErrors = (errors) => {
    if (!errors.length) return false;
    alert(errors.join("\n"));
    return true;
  };

  const validateBasicInformation = () => {
    const errors = [];

    if (!c.fullName?.trim()) errors.push("Full name is required.");
    else if (!REGEX.name.test(c.fullName.trim())) {
      errors.push("Full name must contain only letters and spaces.");
    }

    if (!c.phone?.trim()) errors.push("Mobile number is required.");
    else if (!REGEX.mobile.test(c.phone.trim())) {
      errors.push("Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.");
    }

    if (!c.email?.trim()) errors.push("Email address is required.");
    else if (!REGEX.email.test(c.email.trim())) errors.push("Please enter a valid email address.");

    if (!c.address?.trim()) errors.push("Address is required.");
    if (!c.appliedRole?.trim()) errors.push("Applied role is required.");

    if (!c.pan?.trim()) errors.push("PAN number is required.");
    else if (!REGEX.pan.test(c.pan.trim().toUpperCase())) {
      errors.push("PAN must be exactly 10 characters in ABCDE1234F format.");
    }

    if (c.aadhaar?.trim() && !REGEX.aadhaar.test(c.aadhaar.trim())) {
      errors.push("Aadhaar number must be exactly 12 digits.");
    }

    const duplicate = findDuplicateIdentity(allCandidates(), c, c.id);
    if (duplicate) {
      errors.push("PAN, Aadhaar, or UAN already exists for another candidate.");
    }

    return !showValidationErrors(errors);
  };

  const validateEducationDetails = () => {
    const errors = [];
    const currentYear = new Date().getFullYear();

    if (c.passingYear && (!REGEX.year.test(String(c.passingYear)) || Number(c.passingYear) > currentYear)) {
      errors.push("Passing year must be a valid year and cannot be in the future.");
    }

    if (c.percentage && !REGEX.number.test(String(c.percentage))) {
      errors.push("Percentage / CGPA must contain numbers only.");
    }

    if (!c.skills || c.skills.length === 0) {
      errors.push("Please select at least one technical skill.");
    }

    return !showValidationErrors(errors);
  };

  const validateEmploymentDetails = () => {
    const errors = [];

    if (c.candidateType === "Fresher") {
      return true;
    }

    if (!c.previousCompany?.trim()) errors.push("Previous company name is required.");
    if (!c.previousDesignation?.trim()) errors.push("Previous designation is required.");
    if (!c.experience?.trim()) errors.push("Total experience is required.");
    else if (!REGEX.number.test(String(c.experience))) errors.push("Experience must be a valid number.");

    if (c.lastCtc && !REGEX.number.test(String(c.lastCtc))) errors.push("Last CTC must be a valid number.");

    if (!c.uan?.trim()) errors.push("UAN number is required for experienced candidates.");
    else if (!REGEX.uan.test(c.uan.trim())) errors.push("UAN number must be exactly 12 digits.");

    if (c.currentlyEmployed === "Yes") {
      if (!c.currentCompany?.trim()) errors.push("Current company is required.");
      if (!c.currentDesignation?.trim()) errors.push("Current designation is required.");
      if (!c.currentCtc?.trim()) errors.push("Current CTC is required.");
      else if (!REGEX.number.test(String(c.currentCtc))) errors.push("Current CTC must be a valid number.");
    }

    if (c.holdingOfferLetter === "Yes") {
      if (!c.offerCompanyName?.trim()) errors.push("Offer company name is required.");
      if (!c.offeredCtc?.trim()) errors.push("Offered CTC is required.");
      else if (!REGEX.number.test(String(c.offeredCtc))) errors.push("Offered CTC must be a valid number.");
      if (!c.joiningDate) errors.push("Joining date is required.");
    }

    const duplicate = findDuplicateIdentity(allCandidates(), c, c.id);
    if (duplicate) {
      errors.push("PAN, Aadhaar, or UAN already exists for another candidate.");
    }

    return !showValidationErrors(errors);
  };

  const nextFromBasic = () => {
    if (!validateBasicInformation()) return;
    goToStep(2);
  };

  const nextFromEducation = () => {
    if (!validateEducationDetails()) return;
    goToStep(3);
  };

  const nextFromEmployment = () => {
    if (!validateEmploymentDetails()) return;

    const updated = {
      ...c,
      profileStep: 4,
      status: c.status || "Draft",
      updatedAt: new Date().toISOString(),
    };

    updateCandidate(c.id, updated);
    setC(updated);
    navigate("/candidate-documents");
  };

  const goToReview = () => {
    const updated = {
      ...c,
      profileStep: 5,
      status: c.status || "Draft",
      updatedAt: new Date().toISOString(),
    };

    updateCandidate(c.id, updated);
    setC(updated);
  };

  const submit = () => {
    if (!validateBasicInformation() || !validateEducationDetails() || !validateEmploymentDetails()) return;

    const updated = {
      ...c,
      profileStep: 6,
      status: "Pending Verification",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateCandidate(c.id, updated);
    setC(updated);
    alert("Application submitted to HR/Admin.");
  };

  const stepPercent = Math.min(step, 5) * 20;

  return (
    <div className="app">
      <Sidebar type="CANDIDATE" />

      <main className="content">
        <div className="page-head">
          <div>
            <h1>Candidate Portal</h1>
            <p className="muted">
              Application ID: {c.id} •{" "}
              <span className="badge pending">{c.status || "Draft"}</span>
            </p>
          </div>

          <div className="actions">
            <button className="btn ghost" onClick={editApplication}>
              ✏️ Edit Application
            </button>

            <button className="btn dark" onClick={viewApplication}>
              👁️ View My Application
            </button>

            <Link className="btn primary" to="/candidate-documents">
              Upload Documents
            </Link>
          </div>
        </div>

        <section className="panel">
          <div className="step-header">
            <h2>Application Progress</h2>
            <p className="muted">Step {Math.min(step, 5)} of 5</p>
          </div>

          <div className="step-progress">
            <div style={{ width: `${stepPercent}%` }}></div>
          </div>

          <div className="step-labels">
            <span className={step >= 1 ? "active" : ""}>Basic</span>
            <span className={step >= 2 ? "active" : ""}>Education</span>
            <span className={step >= 3 ? "active" : ""}>Employment</span>
            <span className={step >= 4 ? "active" : ""}>Documents</span>
            <span className={step >= 5 ? "active" : ""}>Review</span>
          </div>
        </section>

        {step === 1 && (
          <section className="panel">
            <h2>Basic Information</h2>

            <div className="grid2">
              <input
                placeholder="Full Name"
                value={c.fullName || ""}
                maxLength={60}
                onChange={(e) => set("fullName", e.target.value)}
              />

              <input
                placeholder="Phone"
                value={c.phone || ""}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) => set("phone", e.target.value)}
              />

              <input
                placeholder="Email"
                value={c.email || ""}
                onChange={(e) => set("email", e.target.value)}
              />

              <input
                placeholder="Address"
                value={c.address || ""}
                onChange={(e) => set("address", e.target.value)}
              />

              <input
                placeholder="PAN Number (ABCDE1234F)"
                value={c.pan || ""}
                maxLength={10}
                onChange={(e) => set("pan", e.target.value)}
              />

              <input
                placeholder="Aadhaar Number (12 digits)"
                value={c.aadhaar || ""}
                maxLength={12}
                inputMode="numeric"
                onChange={(e) => set("aadhaar", e.target.value)}
              />

              <input
                placeholder="Applied Role"
                value={c.appliedRole || ""}
                onChange={(e) => set("appliedRole", e.target.value)}
              />

              <select
                value={c.candidateType || "Fresher"}
                onChange={(e) => set("candidateType", e.target.value)}
              >
                <option>Fresher</option>
                <option>Experienced</option>
              </select>
            </div>

            <div className="actions candidate-step-actions">
              <button className="btn" onClick={saveDraft}>
                Save Draft
              </button>

              <button className="btn primary" onClick={nextFromBasic}>
                Save & Continue
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="panel">
            <h2>Educational Details</h2>
            <p className="muted">
              Educational details are useful for HR verification, but not mandatory.
            </p>

            <div className="grid2">
              <input
                placeholder="Highest Education"
                value={c.education || ""}
                onChange={(e) => set("education", e.target.value)}
              />

              <input
                placeholder="College / University"
                value={c.college || ""}
                onChange={(e) => set("college", e.target.value)}
              />

              <input
                placeholder="Passing Year"
                value={c.passingYear || ""}
                onChange={(e) => set("passingYear", e.target.value)}
              />

              <input
                placeholder="Percentage / CGPA"
                value={c.percentage || ""}
                onChange={(e) => set("percentage", e.target.value)}
              />
            </div>

            <div className="form-block">
              <h3>Technical Skills</h3>
              <p className="muted">Select all skills that match your profile.</p>
              <div className="chips">
                {SKILLS.map((skill) => (
                  <label key={skill}>
                    <input
                      type="checkbox"
                      checked={(c.skills || []).includes(skill)}
                      onChange={(e) =>
                        toggleMultiValue("skills", skill, e.target.checked)
                      }
                    />
                    {skill}
                  </label>
                ))}
              </div>
            </div>

            <div className="actions candidate-step-actions">
              <button className="btn" onClick={() => goToStep(1)}>
                Back
              </button>

              <button className="btn" onClick={saveDraft}>
                Save Draft
              </button>

              <button className="btn primary" onClick={nextFromEducation}>
                Save & Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="panel">
            <h2>Employment Details</h2>

            {c.candidateType === "Fresher" ? (
              <>
                <p className="muted">
                  Fresher candidates can continue directly to document upload.
                </p>

                <h3>Selected Skills</h3>
                <div className="skill-summary">
                  {(c.skills || []).length ? (
                    (c.skills || []).map((skill) => <span className="chip" key={skill}>{skill}</span>)
                  ) : (
                    <p className="muted">No technical skills selected yet. Go back to Education step to select skills.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="form-block">
                  <h3>Previous Company Details</h3>

                  <div className="grid2">
                    <input
                      placeholder="Previous Company Name"
                      value={c.previousCompany || ""}
                      onChange={(e) => set("previousCompany", e.target.value)}
                    />

                    <input
                      placeholder="Previous Designation"
                      value={c.previousDesignation || ""}
                      onChange={(e) => set("previousDesignation", e.target.value)}
                    />

                    <input
                      placeholder="Total Experience"
                      value={c.experience || ""}
                      onChange={(e) => set("experience", e.target.value)}
                    />

                    <input
                      placeholder="Last CTC"
                      value={c.lastCtc || ""}
                      onChange={(e) => set("lastCtc", e.target.value)}
                    />

                    <input
                      placeholder="Last Working Day"
                      value={c.lastWorkingDay || ""}
                      onChange={(e) => set("lastWorkingDay", e.target.value)}
                    />

                    <input
                      placeholder="UAN Number (12 digits)"
                      value={c.uan || ""}
                      maxLength={12}
                      inputMode="numeric"
                      onChange={(e) => set("uan", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-block">
                  <h3>Current Employment Details</h3>

                  <div className="employment-status-box">
                    <label className={c.currentlyEmployed === "Yes" ? "selected" : ""}>
                      <input
                        type="radio"
                        name="currentlyEmployed"
                        value="Yes"
                        checked={c.currentlyEmployed === "Yes"}
                        onChange={(e) => set("currentlyEmployed", e.target.value)}
                      />
                      Currently Employed
                    </label>

                    <label className={c.currentlyEmployed !== "Yes" ? "selected" : ""}>
                      <input
                        type="radio"
                        name="currentlyEmployed"
                        value="No"
                        checked={c.currentlyEmployed !== "Yes"}
                        onChange={(e) => set("currentlyEmployed", e.target.value)}
                      />
                      Not Currently Employed
                    </label>
                  </div>

                  {c.currentlyEmployed === "Yes" && (
                    <div className="grid2">
                      <input
                        placeholder="Current Company"
                        value={c.currentCompany || ""}
                        onChange={(e) => set("currentCompany", e.target.value)}
                      />

                      <input
                        placeholder="Current Designation"
                        value={c.currentDesignation || ""}
                        onChange={(e) => set("currentDesignation", e.target.value)}
                      />

                      <input
                        placeholder="Current CTC"
                        value={c.currentCtc || ""}
                        onChange={(e) => set("currentCtc", e.target.value)}
                      />

                      <input
                        placeholder="Notice Period"
                        value={c.noticePeriod || ""}
                        onChange={(e) => set("noticePeriod", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="form-block">
                  <h3>Offer Letter Details</h3>

                  <div className="employment-status-box">
                    <label className={c.holdingOfferLetter === "Yes" ? "selected" : ""}>
                      <input
                        type="radio"
                        name="holdingOfferLetter"
                        value="Yes"
                        checked={c.holdingOfferLetter === "Yes"}
                        onChange={(e) => set("holdingOfferLetter", e.target.value)}
                      />
                      Holding Offer Letter
                    </label>

                    <label className={c.holdingOfferLetter !== "Yes" ? "selected" : ""}>
                      <input
                        type="radio"
                        name="holdingOfferLetter"
                        value="No"
                        checked={c.holdingOfferLetter !== "Yes"}
                        onChange={(e) => set("holdingOfferLetter", e.target.value)}
                      />
                      Not Holding Offer Letter
                    </label>
                  </div>

                  {c.holdingOfferLetter === "Yes" && (
                    <div className="grid2">
                      <input
                        placeholder="Offer Company Name"
                        value={c.offerCompanyName || ""}
                        onChange={(e) => set("offerCompanyName", e.target.value)}
                      />

                      <input
                        placeholder="Offered CTC"
                        value={c.offeredCtc || ""}
                        onChange={(e) => set("offeredCtc", e.target.value)}
                      />

                      <input
                        placeholder="Joining Date"
                        type="date"
                        value={c.joiningDate || ""}
                        onChange={(e) => set("joiningDate", e.target.value)}
                      />

                      <input
                        placeholder="Offer Reference Number"
                        value={c.offerReferenceNumber || ""}
                        onChange={(e) =>
                          set("offerReferenceNumber", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="actions candidate-step-actions">
              <button className="btn" onClick={() => goToStep(2)}>
                Back
              </button>

              <button className="btn" onClick={saveDraft}>
                Save Draft
              </button>

              <button className="btn primary" onClick={nextFromEmployment}>
                Save & Go to Documents
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="panel">
            <h2>Document Upload</h2>
            <p className="muted">
              Please upload the required documents before final submission.
            </p>

            <div className="actions candidate-step-actions">
              <Link className="btn primary" to="/candidate-documents">
                Upload Documents
              </Link>

              <button className="btn" onClick={() => goToStep(3)}>
                Back
              </button>

              <button className="btn dark" onClick={goToReview}>
                Continue to Review
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="panel">
            <h2>Review Application</h2>

            <div className="review-grid">
              <div>
                <h3>Basic Information</h3>
                <p><b>Name:</b> {c.fullName}</p>
                <p><b>Phone:</b> {c.phone}</p>
                <p><b>Email:</b> {c.email}</p>
                <p><b>Address:</b> {c.address}</p>
                <p><b>PAN:</b> {c.pan}</p>
                <p><b>Aadhaar:</b> {c.aadhaar || "Not provided"}</p>
                <p><b>Applied Role:</b> {c.appliedRole}</p>
                <p><b>Candidate Type:</b> {c.candidateType}</p>
              </div>

              <div>
                <h3>Educational Details</h3>
                <p><b>Education:</b> {c.education || "Not provided"}</p>
                <p><b>College:</b> {c.college || "Not provided"}</p>
                <p><b>Passing Year:</b> {c.passingYear || "Not provided"}</p>
                <p><b>Percentage / CGPA:</b> {c.percentage || "Not provided"}</p>
              </div>

              <div>
                <h3>Skills</h3>
                <p><b>Technical:</b> {(c.skills || []).join(", ") || "No skills selected"}</p>
              </div>

              <div>
                <h3>
                  {c.candidateType === "Fresher"
                    ? "Employment Details"
                    : "Previous Company Details"}
                </h3>

                {c.candidateType === "Fresher" ? (
                  <p className="muted">Fresher candidate</p>
                ) : (
                  <>
                    <p><b>Previous Company:</b> {c.previousCompany}</p>
                    <p><b>Previous Designation:</b> {c.previousDesignation}</p>
                    <p><b>Experience:</b> {c.experience}</p>
                    <p><b>Last CTC:</b> {c.lastCtc}</p>
                    <p><b>Last Working Day:</b> {c.lastWorkingDay}</p>
                    <p><b>UAN:</b> {c.uan}</p>
                    <p><b>UAN Status:</b> {c.uanVerified ? "Verified by HR" : "Pending HR Verification"}</p>
                  </>
                )}
              </div>

              {c.candidateType === "Experienced" && (
                <div>
                  <h3>Current Employment & Offer Letter</h3>
                  <p><b>Currently Employed:</b> {c.currentlyEmployed}</p>
                  {c.currentlyEmployed === "Yes" && (
                    <>
                      <p><b>Current Company:</b> {c.currentCompany}</p>
                      <p><b>Current Designation:</b> {c.currentDesignation}</p>
                      <p><b>Current CTC:</b> {c.currentCtc}</p>
                      <p><b>Notice Period:</b> {c.noticePeriod}</p>
                    </>
                  )}

                  <p><b>Holding Offer Letter:</b> {c.holdingOfferLetter}</p>
                  {c.holdingOfferLetter === "Yes" && (
                    <>
                      <p><b>Offer Company:</b> {c.offerCompanyName}</p>
                      <p><b>Offered CTC:</b> {c.offeredCtc}</p>
                      <p><b>Joining Date:</b> {c.joiningDate}</p>
                      <p><b>Offer Reference:</b> {c.offerReferenceNumber}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <section className="panel soft">
              <h3>Remarks</h3>
              <p className="muted">{c.remarks || "No HR remarks yet."}</p>
            </section>

            <div className="actions">
              <button className="btn" onClick={() => goToStep(4)}>
                Back
              </button>

              <button className="btn" onClick={editApplication}>
                Edit Application
              </button>

              <button className="btn" onClick={saveDraft}>
                Save Draft
              </button>

              <button className="btn primary" onClick={submit}>
                Submit to HR/Admin
              </button>
            </div>
          </section>
        )}

        {step >= 6 && (
          <section className="panel">
            <h2>Application Submitted</h2>
            <p className="muted">
              Your application has been submitted to HR/Admin for offer letter
              verification.
            </p>

            <p>
              Status:{" "}
              <span className="badge pending">
                {c.status || "Pending Verification"}
              </span>
            </p>

            <div className="actions">
              <button className="btn ghost" onClick={viewApplication}>
                👁️ View My Application
              </button>

              <button className="btn primary" onClick={editApplication}>
                ✏️ Edit Application
              </button>

              <Link className="btn" to="/candidate-documents">
                Upload Documents
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
