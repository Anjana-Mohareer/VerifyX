import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { extractTenthMarksheet } from '../services/documentExtractionService';
import { automaticallyVerifyCandidateDocument } from '../services/automaticDocumentVerificationService';
import { findLocalCandidate } from '../services/localStorage/storage';
import { saveApplication, submitApplication } from '../services/candidateApplicationService';
import { sendApplicationSubmittedMail, sendProfileCompletionReminder } from '../services/mailService';
import { addNotification, ensureRegistrationReminder } from '../services/notificationService';
import { IT_SKILLS, IT_TOOLS, getRoleRecommendations } from '../utils/constants';
import SkillMultiSelect from '../components/SkillMultiSelect';
import './CandidateWelcome.css';

const educationTemplate = {
  institution: '', boardUniversity: '', location: '', registrationNumber: '',
  startYear: '', endYear: '', passingYear: '', percentage: '', specialization: '', degree: '', marksheetName: ''
};

const documentTemplate = {};

const empty = {
  fullName: '',
  appliedRole: '',
  skills: [],
  tools: [],
  candidateType: 'Fresher',
  employmentStatus: '',
  tenth: { ...educationTemplate },
  twelfth: { ...educationTemplate },
  degree: { ...educationTemplate },
  master: { ...educationTemplate },
  panNumber: '', aadhaarNumber: '', uanNumber: '',
  currentEmployer: '', currentDesignation: '', currentFrom: '', currentCtc: '',
  previousEmployer: '', previousDesignation: '', previousFrom: '', previousTo: '', previousCtc: '',
  offerLetters: [{ id: 1, companyName: '', designation: '', offeredCtc: '', offeredDate: '', joiningDate: '', referenceNumber: '', fileName: '' }],
  requiredDocuments: { ...documentTemplate },
};

const FRESHER_DOCUMENTS = [
  { name: 'Resume', hint: 'PDF, DOC or DOCX', accept: '.pdf,.doc,.docx' },
  { name: 'Aadhaar Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'PAN Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
];

const CURRENT_EMPLOYEE_DOCUMENTS = [
  { name: 'Resume', hint: 'PDF, DOC or DOCX', accept: '.pdf,.doc,.docx' },
  { name: 'Aadhaar Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'PAN Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Current Offer / Appointment Letter', hint: 'PDF preferred', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Latest Salary Slip', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'UAN Proof', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
];

const NOT_WORKING_DOCUMENTS = [
  { name: 'Resume', hint: 'PDF, DOC or DOCX', accept: '.pdf,.doc,.docx' },
  { name: 'Aadhaar Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'PAN Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Experience Letter', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Relieving Letter', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Last Salary Slip', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'UAN Proof', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
];

const yearOnly = (value) => String(value || '').replace(/\D/g, '').slice(0, 4);
const numberOnly = (value) => String(value || '').replace(/[^0-9.]/g, '').slice(0, 12);
const hasValue = (value) => Boolean(String(value || '').trim());
const panOnly = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
const digitsOnly = (value, max = 12) => String(value || '').replace(/\D/g, '').slice(0, max);
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;
const UAN_REGEX = /^\d{12}$/;

export default function CandidateWelcome() {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  const identity = session?.id || session?.email;
  const key = `verifyx_welcome_profile_${identity}`;
  const startedKey = `verifyx_welcome_started_${identity}`;
  const completeKey = `verifyx_welcome_complete_${identity}`;
  const portalAccessKey = `verifyx_portal_access_${identity}`;
  const [form, setForm] = useState(empty);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    const local = findLocalCandidate(session?.email) || {};
    setForm({
      ...empty,
      ...saved,
      fullName: saved?.fullName || local.fullName || session?.name || '',
      appliedRole: saved?.appliedRole || local.appliedRole || session?.appliedRole || '',
      skills: Array.isArray(saved?.skills) ? saved.skills : (Array.isArray(local.skills) ? local.skills : []),
      tools: Array.isArray(saved?.tools) ? saved.tools : (Array.isArray(local.tools) ? local.tools : []),
      candidateType: saved?.candidateType || local.candidateType || session?.candidateType || 'Fresher',
      employmentStatus: saved?.employmentStatus || '',
      panNumber: saved?.panNumber || local.panNumber || local.pan || '',
      aadhaarNumber: saved?.aadhaarNumber || local.aadhaarNumber || local.aadhaar || '',
      uanNumber: saved?.uanNumber || local.uanNumber || local.uan || '',
      tenth: { ...educationTemplate, ...(saved?.tenth || {}) },
      twelfth: { ...educationTemplate, ...(saved?.twelfth || {}) },
      degree: { ...educationTemplate, ...(saved?.degree || {}) },
      master: { ...educationTemplate, ...(saved?.master || {}) },
      offerLetters: Array.isArray(saved?.offerLetters) && saved.offerLetters.length ? saved.offerLetters : empty.offerLetters,
      requiredDocuments: { ...(saved?.requiredDocuments || {}) },
    });
  }, [key, session?.email, session?.name, session?.candidateType]);

  useEffect(() => { ensureRegistrationReminder({ email: session?.email }); }, [session?.email]);

  useEffect(() => {
    if (!identity || !form.fullName) return;
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify({ ...form, lastSavedAt: new Date().toISOString() }));
      localStorage.setItem(startedKey, 'true');
      setSavedMessage('Draft saved automatically');
      setTimeout(() => setSavedMessage(''), 1400);
    }, 450);
    return () => clearTimeout(timer);
  }, [form, identity, key, startedKey]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setIdentityNumber = (field, value, docName) => setForm((f) => ({
    ...f,
    [field]: value,
    requiredDocuments: f.requiredDocuments?.[docName]
      ? { ...f.requiredDocuments, [docName]: { ...f.requiredDocuments[docName], verificationStatus: 'VERIFYING', verificationMessage: 'Re-checking automatically…', verifiedAt: '' } }
      : f.requiredDocuments,
  }));
  const setEdu = (section, field, value) => setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));

  const readTenthMarksheet = async (file) => {
    if (!file) return;
    setExtracting(true); setMessage('Reading 10th marksheet and matching available fields…');
    setEdu('tenth', 'marksheetName', file.name);
    try {
      const data = await extractTenthMarksheet(file);
      setForm((f) => ({
        ...f,
        fullName: data.name || f.fullName,
        tenth: {
          ...f.tenth,
          boardUniversity: data.board || f.tenth.boardUniversity,
          institution: data.school || f.tenth.institution,
          registrationNumber: data.rollNumber || f.tenth.registrationNumber,
          passingYear: data.passingYear || f.tenth.passingYear,
          percentage: data.percentage || f.tenth.percentage,
          marksheetName: file.name,
        },
      }));
      setMessage(data.source === 'manual-required'
        ? 'Scanned/image marksheets need the OCR backend for automatic reading. The file is selected and you can fill any missing fields manually.'
        : 'Available 10th marksheet details were filled automatically. Please review them.');
    } catch (e) { setMessage(e.message || 'Unable to read this file.'); }
    finally { setExtracting(false); }
  };

  const selectEducationFile = (section, file) => {
    if (!file) return;
    setEdu(section, 'marksheetName', file.name);
  };

  const addOfferLetter = () => setForm((f) => ({
    ...f,
    offerLetters: [...f.offerLetters, { id: Date.now(), companyName: '', designation: '', offeredCtc: '', offeredDate: '', joiningDate: '', referenceNumber: '', fileName: '' }],
  }));
  const updateOffer = (id, field, value) => setForm((f) => ({
    ...f,
    offerLetters: f.offerLetters.map((offer) => offer.id === id ? { ...offer, [field]: value } : offer),
  }));
  const removeOffer = (id) => setForm((f) => ({ ...f, offerLetters: f.offerLetters.filter((offer) => offer.id !== id) }));

  const normalizedCandidateType = String(form.candidateType || '').toUpperCase();
  const isExperienced = normalizedCandidateType.includes('EXPER');

  const educationCompletion = useMemo(() => {
    const required = [
      form.tenth.institution, form.tenth.boardUniversity, form.tenth.registrationNumber, form.tenth.passingYear, form.tenth.percentage,
      form.twelfth.institution, form.twelfth.boardUniversity, form.twelfth.registrationNumber, form.twelfth.passingYear, form.twelfth.percentage,
      form.degree.degree, form.degree.institution, form.degree.boardUniversity, form.degree.registrationNumber, form.degree.endYear, form.degree.percentage,
    ];
    const filled = required.filter(hasValue).length;
    return Math.round((filled / required.length) * 100);
  }, [form]);

  const employmentComplete = useMemo(() => {
    if (!isExperienced) return true;
    if (!form.employmentStatus) return false;
    if (form.employmentStatus === 'CURRENTLY_WORKING') {
      return [form.currentEmployer, form.currentDesignation, form.currentFrom, form.currentCtc].every(hasValue);
    }
    return [form.previousEmployer, form.previousDesignation, form.previousFrom, form.previousTo, form.previousCtc].every(hasValue);
  }, [form, isExperienced]);

  const skillsComplete = Array.isArray(form.skills) && form.skills.length > 0;
  const informationComplete = educationCompletion === 100 && employmentComplete && skillsComplete;
  const roleRecommendations = useMemo(() => getRoleRecommendations(form.appliedRole), [form.appliedRole]);

  const requiredDocumentList = useMemo(() => {
    if (!informationComplete) return [];
    if (!isExperienced) return FRESHER_DOCUMENTS;
    return form.employmentStatus === 'CURRENTLY_WORKING' ? CURRENT_EMPLOYEE_DOCUMENTS : NOT_WORKING_DOCUMENTS;
  }, [informationComplete, isExperienced, form.employmentStatus]);

  const documentCompletion = useMemo(() => {
    if (!requiredDocumentList.length) return 0;
    const filled = requiredDocumentList.filter((doc) => hasValue(form.requiredDocuments?.[doc.name]?.fileName)).length;
    return Math.round((filled / requiredDocumentList.length) * 100);
  }, [requiredDocumentList, form.requiredDocuments]);

  const identityNumbersValid = useMemo(() => {
    const panValid = PAN_REGEX.test(String(form.panNumber || '').toUpperCase());
    const aadhaar = String(form.aadhaarNumber || '').replace(/\D/g, '');
    const aadhaarValid = AADHAAR_REGEX.test(aadhaar) && !/^(\d)\1{11}$/.test(aadhaar);
    const uanValid = !isExperienced || UAN_REGEX.test(String(form.uanNumber || '').replace(/\D/g, ''));
    return { panValid, aadhaarValid, uanValid, allValid: panValid && aadhaarValid && uanValid };
  }, [form.panNumber, form.aadhaarNumber, form.uanNumber, isExperienced]);

  const verifiedDocumentCount = useMemo(() => requiredDocumentList.filter((doc) => form.requiredDocuments?.[doc.name]?.verificationStatus === 'VERIFIED').length, [requiredDocumentList, form.requiredDocuments]);
  const documentVerificationComplete = Boolean(requiredDocumentList.length) && verifiedDocumentCount === requiredDocumentList.length && identityNumbersValid.allValid;

  const runAutomaticVerification = async (name, file = null, numbers = null) => {
    const snapshot = numbers || {
      panNumber: form.panNumber,
      aadhaarNumber: form.aadhaarNumber,
      uanNumber: form.uanNumber,
    };
    const metadata = form.requiredDocuments?.[name] || {};
    const result = await automaticallyVerifyCandidateDocument({
      documentName: name,
      file,
      metadata,
      ...snapshot,
    });
    setForm((f) => {
      const existing = f.requiredDocuments?.[name];
      if (!existing?.fileName) return f;
      return {
        ...f,
        requiredDocuments: {
          ...f.requiredDocuments,
          [name]: {
            ...existing,
            verificationStatus: result.ok ? 'VERIFIED' : 'FAILED',
            verificationMessage: result.message,
            verificationSource: result.source || 'automatic-check',
            verifiedAt: result.ok ? new Date().toISOString() : '',
          },
        },
      };
    });
    return result;
  };

  useEffect(() => {
    const identityDocs = [
      ['PAN Card', form.panNumber],
      ['Aadhaar Card', form.aadhaarNumber],
      ['UAN Proof', form.uanNumber],
    ];
    const timer = setTimeout(() => {
      identityDocs.forEach(([name]) => {
        if (form.requiredDocuments?.[name]?.fileName) {
          runAutomaticVerification(name, null, {
            panNumber: form.panNumber,
            aadhaarNumber: form.aadhaarNumber,
            uanNumber: form.uanNumber,
          });
        }
      });
    }, 550);
    return () => clearTimeout(timer);
  // Re-run only when identity values change; requiredDocuments is intentionally excluded.
  }, [form.panNumber, form.aadhaarNumber, form.uanNumber]);

  const overallCompletion = useMemo(() => {
    const infoWeight = Math.round((educationCompletion * 0.68) + (employmentComplete ? 22 : 0) + (skillsComplete ? 10 : 0));
    if (!informationComplete) return Math.min(80, infoWeight);
    return Math.round(80 + (documentCompletion * 0.2));
  }, [educationCompletion, employmentComplete, skillsComplete, informationComplete, documentCompletion]);

  const addRequiredDocument = async (name, file) => {
    if (!file) return;
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSavedMessage(`${name} must be 5 MB or smaller.`);
      return;
    }
    const numbers = { panNumber: form.panNumber, aadhaarNumber: form.aadhaarNumber, uanNumber: form.uanNumber };
    setForm((f) => ({
      ...f,
      requiredDocuments: {
        ...f.requiredDocuments,
        [name]: { fileName: file.name, size: file.size, type: file.type || '', selectedAt: new Date().toISOString(), verificationStatus: 'VERIFYING', verificationMessage: 'Checking automatically…' },
      },
    }));
    setSavedMessage(`${name} uploaded. Automatic verification is running…`);
    const result = await automaticallyVerifyCandidateDocument({ documentName: name, file, metadata: { fileName: file.name, size: file.size, type: file.type || '' }, ...numbers });
    setForm((f) => ({
      ...f,
      requiredDocuments: {
        ...f.requiredDocuments,
        [name]: {
          ...f.requiredDocuments[name],
          verificationStatus: result.ok ? 'VERIFIED' : 'FAILED',
          verificationMessage: result.message,
          verificationSource: result.source || 'automatic-check',
          verifiedAt: result.ok ? new Date().toISOString() : '',
        },
      },
    }));
    setSavedMessage(result.ok ? `${name} verified automatically.` : `${name}: ${result.message}`);
  };

  const removeRequiredDocument = (name) => setForm((f) => {
    const next = { ...f.requiredDocuments };
    delete next[name];
    return { ...f, requiredDocuments: next };
  });

  const persist = (complete = false) => {
    localStorage.setItem(key, JSON.stringify({ ...form, lastSavedAt: new Date().toISOString(), ...(complete ? { completedAt: new Date().toISOString() } : {}) }));
    localStorage.setItem(startedKey, 'true');
    if (complete) localStorage.setItem(completeKey, 'true');
  };

  const saveAndExit = async () => {
    persist(false);
    saveApplication(identity, { ...form, status: 'DRAFT', informationComplete, documentCompletion, overallCompletion, requiredDocumentNames: requiredDocumentList.map((doc) => doc.name) });
    ensureRegistrationReminder({ email: session?.email });
    sendProfileCompletionReminder({ email: session?.email, fullName: form.fullName || session?.name }).catch(() => {});
    await logout();
    nav('/candidate-login', { replace: true, state: { message: 'Draft saved. Please login again when you are ready to complete your registration.' } });
  };
  const continueToPortal = async (e) => {
    e.preventDefault();
    if (!informationComplete) {
      setSavedMessage(isExperienced
        ? 'Complete the required education, employment and technical skills information, or use Save Draft & Exit.'
        : 'Complete the required 10th, 12th, Degree and technical skills information, or use Save Draft & Exit.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (documentCompletion < 100) {
      setSavedMessage('Upload all required documents before submitting the application, or use Save Draft & Exit.');
      document.getElementById('required-documents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!documentVerificationComplete) {
      setSavedMessage('Automatic verification must pass for PAN, Aadhaar, UAN (if applicable) and every required document before submission.');
      document.getElementById('required-documents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    persist(true);
    const localCandidate = findLocalCandidate(session?.email) || {};
    const submitted = submitApplication(identity, {
      ...form,
      appliedRole: session?.appliedRole || localCandidate.appliedRole || '',
      informationComplete: true,
      documentCompletion: 100,
      overallCompletion: 100,
      requiredDocumentNames: requiredDocumentList.map((doc) => doc.name),
    }, session);
    localStorage.setItem(portalAccessKey, 'true');
    localStorage.setItem(completeKey, 'true');
    addNotification({ audience: 'CANDIDATE', recipient: session?.email, type: 'SUBMISSION_SUCCESS', applicationId: submitted.applicationId, title: 'Documents submitted successfully', message: `Your application ${submitted.applicationId} and all required documents were submitted successfully for HR review.` });
    addNotification({ audience: 'HR', type: 'NEW_CANDIDATE', applicationId: submitted.applicationId, title: 'New candidate registered', message: `${form.fullName || session?.name || 'A candidate'} submitted documents for ${submitted.appliedRole || 'the applied role'}. Application ${submitted.applicationId} is ready for review.` });
    setSavedMessage('Documents submitted successfully. You will be logged out securely…');
    sendApplicationSubmittedMail({ ...localCandidate, ...session, fullName: form.fullName }, submitted).catch(() => {});
    setTimeout(async () => {
      await logout();
      nav('/candidate-login', { replace: true, state: { message: `Documents submitted successfully. Application ${submitted.applicationId} was sent to HR for review.` } });
    }, 1800);
  };

  const changeCandidateType = (value) => {
    setForm((f) => ({
      ...f,
      candidateType: value,
      employmentStatus: value === 'Fresher' ? '' : f.employmentStatus,
    }));
  };

  return <div className="candidate-onboarding-page">
    <header className="onboarding-topbar">
      <div className="onboarding-brand"><span>VX</span><div><b>Verify-X</b><small>Candidate onboarding</small></div></div>
      <div className="onboarding-save-state"><span className="save-dot" />{savedMessage || 'Your progress is saved locally'}</div>
      <button type="button" className="btn ghost onboarding-exit" onClick={saveAndExit}>Save Draft & Logout</button>
    </header>

    <main className="onboarding-shell">
      <section className="onboarding-hero page-enter">
        <div><span className="welcome-kicker">Candidate application</span><h1>Welcome, {form.fullName || 'Candidate'}</h1><p>Complete your education and employment information first. Once the required details are complete, Verify-X will show the documents required for your candidate type and employment status.</p></div>
        <div className="profile-meter"><div><b>{overallCompletion}%</b><span>Application progress</span></div><div className="meter-track"><i style={{ width: `${overallCompletion}%` }} /></div></div>
      </section>

      <form className="welcome-form page-enter" onSubmit={continueToPortal}>
        <section className="welcome-section candidate-type-section">
          <div className="section-title"><span>00</span><div><h2>Candidate Type</h2><p>This controls the employment information and required-document checklist.</p></div></div>
          <div className="candidate-type-options">
            <label className={normalizedCandidateType.includes('FRESH') ? 'selected' : ''}><input type="radio" name="candidateType" value="Fresher" checked={normalizedCandidateType.includes('FRESH')} onChange={(e)=>changeCandidateType(e.target.value)} /><div><b>Fresher</b><span>No previous full-time employment</span></div></label>
            <label className={isExperienced ? 'selected' : ''}><input type="radio" name="candidateType" value="Experienced" checked={isExperienced} onChange={(e)=>changeCandidateType(e.target.value)} /><div><b>Experienced</b><span>Has current or previous employment</span></div></label>
          </div>
        </section>

        <EducationCard number="01" title="10th / SSLC" subtitle="Required • Upload marksheet for supported auto-fill" section="tenth" data={form.tenth} setEdu={setEdu} fileHandler={readTenthMarksheet} extracting={extracting} message={message} />
        <EducationCard number="02" title="12th / PUC" subtitle="Required" section="twelfth" data={form.twelfth} setEdu={setEdu} fileHandler={(file) => selectEducationFile('twelfth', file)} />
        <EducationCard number="03" title="Degree / Bachelor's" subtitle="Required" section="degree" data={form.degree} setEdu={setEdu} fileHandler={(file) => selectEducationFile('degree', file)} degree />
        <EducationCard number="04" title="Master's Degree" subtitle="Optional • Leave empty if not applicable" section="master" data={form.master} setEdu={setEdu} fileHandler={(file) => selectEducationFile('master', file)} degree optional />

        <section className="welcome-section employment-section">
          <div className="section-title"><span>05</span><div><h2>Employment Details</h2><p>{isExperienced ? 'Select your present employment status and provide the corresponding required details.' : 'Freshers do not need to provide employment details.'}</p></div></div>

          {isExperienced && <div className="employment-status-choice">
            <label className={form.employmentStatus === 'CURRENTLY_WORKING' ? 'selected' : ''}><input type="radio" name="employmentStatus" value="CURRENTLY_WORKING" checked={form.employmentStatus === 'CURRENTLY_WORKING'} onChange={(e)=>set('employmentStatus',e.target.value)} /><div><b>Currently Working</b><span>I am employed now</span></div></label>
            <label className={form.employmentStatus === 'NOT_WORKING' ? 'selected' : ''}><input type="radio" name="employmentStatus" value="NOT_WORKING" checked={form.employmentStatus === 'NOT_WORKING'} onChange={(e)=>set('employmentStatus',e.target.value)} /><div><b>Not Currently Working</b><span>My latest employment has ended</span></div></label>
          </div>}

          {!isExperienced ? <div className="fresher-note">No employment details are required for a Fresher. Continue with education and offer information.</div> : <div className="employment-columns">
            <div className={`employment-card ${form.employmentStatus === 'CURRENTLY_WORKING' ? 'required-card' : ''}`}><h3>Current Employer {form.employmentStatus === 'CURRENTLY_WORKING' && <em>Required</em>}</h3><div className="welcome-grid two-col">
              <input placeholder="Current Company" value={form.currentEmployer} onChange={(e)=>set('currentEmployer',e.target.value)} />
              <input placeholder="Current Designation" value={form.currentDesignation} onChange={(e)=>set('currentDesignation',e.target.value)} />
              <label><span>Working From</span><input type="month" value={form.currentFrom} onChange={(e)=>set('currentFrom',e.target.value)} /></label>
              <input placeholder="Current CTC" value={form.currentCtc} onChange={(e)=>set('currentCtc',numberOnly(e.target.value))} />
            </div></div>
            <div className={`employment-card ${form.employmentStatus === 'NOT_WORKING' ? 'required-card' : ''}`}><h3>Previous / Latest Employer {form.employmentStatus === 'NOT_WORKING' && <em>Required</em>}</h3><div className="welcome-grid two-col">
              <input placeholder="Previous Company" value={form.previousEmployer} onChange={(e)=>set('previousEmployer',e.target.value)} />
              <input placeholder="Previous Designation" value={form.previousDesignation} onChange={(e)=>set('previousDesignation',e.target.value)} />
              <label><span>From</span><input type="month" value={form.previousFrom} onChange={(e)=>set('previousFrom',e.target.value)} /></label>
              <label><span>To</span><input type="month" value={form.previousTo} onChange={(e)=>set('previousTo',e.target.value)} /></label>
              <input placeholder="Previous CTC" value={form.previousCtc} onChange={(e)=>set('previousCtc',numberOnly(e.target.value))} />
            </div></div>
          </div>}
        </section>


        <section className="welcome-section skills-section">
          <div className="section-title"><span>06</span><div><h2>Role Skills & Tools</h2><p>Your applied role is <b>{form.appliedRole || 'not selected'}</b>. Recommended skills are highlighted, but you can search and select from the complete IT catalogue.</p></div>{skillsComplete && <div className="skills-ready-badge">✓ Skills added</div>}</div>
          <div className="applied-role-summary"><span>Applied Role</span><b>{form.appliedRole || 'Select a role during registration'}</b><small>Recommendations below automatically follow this role.</small></div>
          <div className="skills-selector-grid">
            <SkillMultiSelect label="Technical Skills" options={IT_SKILLS} value={form.skills || []} recommended={roleRecommendations.skills} onChange={(skills)=>set('skills',skills)} placeholder="Select your technical skills" />
            <SkillMultiSelect label="Tools & Platforms" options={IT_TOOLS} value={form.tools || []} recommended={roleRecommendations.tools} onChange={(tools)=>set('tools',tools)} placeholder="Select tools and platforms you have used" />
          </div>
          {!skillsComplete && <div className="skills-required-note">Select at least one technical skill to unlock the required-document checklist.</div>}
        </section>

        <section className="welcome-section offers-section">
          <div className="section-title offers-title"><span>07</span><div><h2>Offer Letters</h2><p>Add one or multiple offer letters if available. Use “Add Another Offer” for additional offers.</p></div><button type="button" className="btn secondary add-offer-btn" onClick={addOfferLetter}>＋ Add Another Offer</button></div>
          <div className="offer-list">
            {form.offerLetters.map((offer, index) => <article className="offer-card" key={offer.id}>
              <div className="offer-card-head"><div><span>Offer {index + 1}</span><b>{offer.companyName || 'New offer letter'}</b></div>{form.offerLetters.length > 1 && <button type="button" onClick={() => removeOffer(offer.id)} className="remove-offer">Remove</button>}</div>
              <div className="welcome-grid offer-grid">
                <input placeholder="Company Name" value={offer.companyName} onChange={(e)=>updateOffer(offer.id,'companyName',e.target.value)} />
                <input placeholder="Offered Role / Designation" value={offer.designation} onChange={(e)=>updateOffer(offer.id,'designation',e.target.value)} />
                <input placeholder="Offered CTC" value={offer.offeredCtc} onChange={(e)=>updateOffer(offer.id,'offeredCtc',numberOnly(e.target.value))} />
                <label><span>Offer Date</span><input type="date" value={offer.offeredDate} onChange={(e)=>updateOffer(offer.id,'offeredDate',e.target.value)} /></label>
                <label><span>Joining Date</span><input type="date" value={offer.joiningDate} onChange={(e)=>updateOffer(offer.id,'joiningDate',e.target.value)} /></label>
                <input placeholder="Offer / Reference Number" value={offer.referenceNumber} onChange={(e)=>updateOffer(offer.id,'referenceNumber',e.target.value)} />
              </div>
              <label className="compact-upload"><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>updateOffer(offer.id,'fileName',e.target.files?.[0]?.name || '')}/><span>📎 {offer.fileName || 'Upload Offer Letter'}</span><small>PDF / JPG / PNG</small></label>
            </article>)}
          </div>
        </section>

        <section id="required-documents" className={`welcome-section required-documents-section ${!informationComplete ? 'locked-section' : ''}`}>
          <div className="section-title"><span>08</span><div><h2>Required Documents</h2><p>{informationComplete ? `Upload the required documents for ${isExperienced ? (form.employmentStatus === 'CURRENTLY_WORKING' ? 'an experienced candidate who is currently working' : 'an experienced candidate who is not currently working') : 'a fresher'}.` : 'Complete the required education, employment and technical-skills information above to unlock your document checklist.'}</p></div>{informationComplete && <div className="document-progress-badge">{documentCompletion}% uploaded</div>}</div>

          {!informationComplete ? <div className="documents-locked-message"><span>🔒</span><div><b>Document checklist is locked</b><p>Finish the required education/employment details and select at least one technical skill. Your document requirements will then be generated automatically.</p></div></div> : <>
            <div className="document-rule-summary">
              <b>{isExperienced ? (form.employmentStatus === 'CURRENTLY_WORKING' ? 'Currently Working — Required Documents' : 'Not Currently Working — Required Documents') : 'Fresher — Required Documents'}</b>
              <span>{requiredDocumentList.length} documents required • Maximum 5 MB per file</span>
            </div>
            <div className="identity-verification-panel">
              <div className="identity-verification-head"><div><span>Identity verification</span><b>Automatic document verification</b><small>Upload documents and enter identity numbers. Verify-X checks them automatically before submission.</small></div><div className={`verification-score ${documentVerificationComplete ? 'verified' : ''}`}>{verifiedDocumentCount}/{requiredDocumentList.length} verified</div></div>
              <div className="identity-number-grid">
                <label><span>PAN Number *</span><input value={form.panNumber || ''} maxLength={10} placeholder="ABCDE1234F" onChange={(e)=>setIdentityNumber('panNumber',panOnly(e.target.value),'PAN Card')}/><small className={identityNumbersValid.panValid ? 'valid' : ''}>{identityNumbersValid.panValid ? '✓ Valid format' : '5 letters + 4 digits + 1 letter'}</small></label>
                <label><span>Aadhaar Number *</span><input value={form.aadhaarNumber || ''} inputMode="numeric" maxLength={12} placeholder="12-digit Aadhaar number" onChange={(e)=>setIdentityNumber('aadhaarNumber',digitsOnly(e.target.value,12),'Aadhaar Card')}/><small className={identityNumbersValid.aadhaarValid ? 'valid' : ''}>{identityNumbersValid.aadhaarValid ? '✓ Valid format' : 'Enter exactly 12 digits'}</small></label>
                {isExperienced && <label><span>UAN Number *</span><input value={form.uanNumber || ''} inputMode="numeric" maxLength={12} placeholder="12-digit UAN number" onChange={(e)=>setIdentityNumber('uanNumber',digitsOnly(e.target.value,12),'UAN Proof')}/><small className={identityNumbersValid.uanValid ? 'valid' : ''}>{identityNumbersValid.uanValid ? '✓ Valid format' : 'Enter exactly 12 digits'}</small></label>}
              </div>
              <div className="verification-actions-row automatic-verification-row"><div><b>Automatic Checks Are Enabled</b><span>No Candidate Verification Button Is Needed. Each Upload Is Checked Automatically; HR Performs The Final Verification After Submission.</span></div><span className="auto-check-badge">⚡ AUTO</span></div>
            </div>
            <div className="required-document-grid">
              {requiredDocumentList.map((doc) => {
                const uploaded = form.requiredDocuments?.[doc.name];
                const status = uploaded?.verificationStatus || '';
                const isChecking = status === 'VERIFYING';
                return <article className={`required-document-card ${uploaded ? 'uploaded' : ''} ${status ? status.toLowerCase() : ''}`} key={doc.name}>
                  <div className="required-doc-icon">{status === 'VERIFIED' ? '✓' : status === 'FAILED' ? '!' : isChecking ? '⟳' : uploaded ? '↻' : '📄'}</div>
                  <div className="required-doc-copy"><b>{doc.name}</b><span>{uploaded?.fileName || doc.hint}</span>{uploaded && <small className={`doc-verification-text ${status.toLowerCase()}`}>{status === 'VERIFIED' ? 'Verified automatically for submission' : status === 'FAILED' ? uploaded.verificationMessage : isChecking ? 'Automatic verification in progress…' : 'Uploaded • automatic check pending'}</small>}</div>
                  {uploaded ? <button type="button" className="remove-required-doc" onClick={()=>removeRequiredDocument(doc.name)}>Replace</button> : null}
                  <label className="required-doc-upload"><input type="file" accept={doc.accept} onChange={(e)=>addRequiredDocument(doc.name,e.target.files?.[0])}/><span>{uploaded ? 'Choose another file' : 'Upload'}</span></label>
                </article>;
              })}
            </div>
          </>}
        </section>

        <div className="welcome-actions sticky-actions"><div><b>Not finished?</b><span>Save your draft and login again later to continue securely.</span></div><div><button type="button" className="btn ghost" onClick={saveAndExit}>Save Draft & Logout</button><button className="btn primary welcome-continue" disabled={!informationComplete || documentCompletion < 100 || !documentVerificationComplete} title={!informationComplete ? 'Complete required information first' : documentCompletion < 100 ? 'Upload all required documents first' : !documentVerificationComplete ? 'Wait for automatic document verification or fix failed documents' : 'Submit your application to HR'}><span>Submit Application</span><small>{documentVerificationComplete ? 'Ready to submit' : documentCompletion < 100 ? 'Upload documents first' : 'Automatic verification pending'}</small><b>→</b></button></div></div>
      </form>
    </main>
  </div>;
}

function EducationCard({ number, title, subtitle, section, data, setEdu, fileHandler, extracting = false, message = '', degree = false, optional = false }) {
  return <section className="welcome-section education-section">
    <div className="section-title"><span>{number}</span><div><h2>{title} {optional && <em>Optional</em>}</h2><p>{subtitle}</p></div></div>
    <div className="education-layout">
      <label className="smart-upload education-upload"><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>fileHandler(e.target.files?.[0])}/><b>{extracting ? 'Reading document…' : `Upload ${title} Marksheet`}</b><span>{data.marksheetName || 'PDF / JPG / PNG'}</span></label>
      <div className="welcome-grid education-grid">
        {degree && <input placeholder="Degree / Course Name" value={data.degree} onChange={(e)=>setEdu(section,'degree',e.target.value)} />}
        {degree && <input placeholder="Specialization" value={data.specialization} onChange={(e)=>setEdu(section,'specialization',e.target.value)} />}
        <input placeholder={degree ? 'College / Institution Name' : 'School / College Name'} value={data.institution} onChange={(e)=>setEdu(section,'institution',e.target.value)} />
        <input placeholder={degree ? 'University Name' : 'Board Name'} value={data.boardUniversity} onChange={(e)=>setEdu(section,'boardUniversity',e.target.value)} />
        <input placeholder="Location" value={data.location} onChange={(e)=>setEdu(section,'location',e.target.value)} />
        <input placeholder="Registration / Roll Number" value={data.registrationNumber} onChange={(e)=>setEdu(section,'registrationNumber',e.target.value.toUpperCase())} />
        {degree ? <><input placeholder="Start Year" maxLength={4} value={data.startYear} onChange={(e)=>setEdu(section,'startYear',yearOnly(e.target.value))}/><input placeholder="End / Passing Year" maxLength={4} value={data.endYear} onChange={(e)=>setEdu(section,'endYear',yearOnly(e.target.value))}/></> : <input placeholder="Passing Year" maxLength={4} value={data.passingYear} onChange={(e)=>setEdu(section,'passingYear',yearOnly(e.target.value))}/>} 
        <input placeholder="Percentage / CGPA" value={data.percentage} onChange={(e)=>setEdu(section,'percentage',numberOnly(e.target.value))} />
      </div>
    </div>
    {message && section === 'tenth' && <div className="smart-message">{message}</div>}
  </section>;
}
