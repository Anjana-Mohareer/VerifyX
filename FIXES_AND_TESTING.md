# VerifyX frontend – 13 November 2026 QA patch

## Scope
Frontend-only changes; supplied backend source was reviewed for API contract compatibility but was not modified.

## Fixes
1. **HR interview scheduling**: `PUT /api/hr/candidates/{candidateId}/status` now sends `status`, optional `remarks`, and comma-separated ISO-8601 `interviewSlots` as URL query parameters. This matches `CandidateManagementController` (`@RequestParam`), instead of the previous JSON body. Duplicate/past/invalid slot selection now shows a targeted message. Backend rejection details are surfaced rather than a generic alert.
2. **UAN verification**: `PUT /api/hr/candidates/{candidateId}/verify-uan` now sends the `status` request parameter as the controller expects.
3. **Mobile validation**: HR Add/Edit Candidate and Candidate Welcome use 10 digits starting with 6, 7, 8 or 9. Entry is capped at 10 digits on relevant inputs. Candidate registration already used this rule.
4. **PAN/Aadhaar/UAN validation**: HR Edit Candidate validates optional PAN and Aadhaar. Candidate onboarding now blocks submission for invalid PAN (ABCDE1234F), Aadhaar (12 digits, not all repeated), and relevant UAN. Format validation does not verify identity authenticity.
5. **Upload validation**: Candidate onboarding, HR document upload and candidate profile photo preflight check allowed extensions, size, MIME when supplied, and file signatures for PDF/JPG/PNG/DOC/DOCX. File rejection shows a specific message. Server-side malware/content verification remains the backend's responsibility.
6. **Backend upload consistency**: A failed candidate document upload no longer silently appears as a successfully saved/verified backend document; the failure is displayed. The HR document-upload path no longer substitutes browser-only data for a failed backend save.
7. **Login messages**: The UI distinguishes incorrect email or password only when the backend explicitly identifies the field. Ambiguous authentication responses retain the safe generic message.
8. **Browser storage/ports**: Remember Me saves email only, never password. Old remembered-password fields are stripped when encountered. Vite uses strict port 5173 to avoid silently switching ports (and CORS/storage origin mismatches). Browser localStorage/sessionStorage cannot be shared between different localhost ports. Cross-port SSO would require a backend-supported cookie/session design and CORS configuration, outside this frontend-only patch.
9. **Connectivity**: Failed API network requests now explain that the backend may be unavailable or CORS may be misconfigured.

## Source issue document
`issue13.docx` contained one embedded screenshot of an HR scheduling failure (`An unexpected error occurred. Please try again later.`) at `localhost:5173/employees/1?section=documents` and a short note. No additional textual issue checklist was present in that file.

## Verification completed
- Parsed 44 frontend JavaScript/JSX source files with TypeScript's JSX parser: no syntax errors.
- Exercised upload-validation helper with genuine-signature and spoofed/empty/wrong-extension test files: passed.
- Checked HR scheduling and UAN frontend request structure against uploaded Spring Boot controller signatures: matched.
- Checked Vite strict port configuration.
- ZIP archive integrity check passed.

## Not verified / deployment dependencies
- `npm ci --offline` could not install Vite 8.1.0 because the npm package was not cached; therefore a full Vite production build and browser E2E tests were not completed.
- Backend was not started against a live database/mail server; end-to-end scheduling, authentication, upload, and email delivery are not confirmed. The backend may still reject approvals if required documents/UAN are missing, slots conflict, or email delivery fails.
- The backend currently defaults CORS to `http://localhost:5173`. For other ports set `CORS_ALLOWED_ORIGINS` appropriately on the backend, or use port 5173.
- Browser password-manager autofill is controlled by browser settings, separate from application storage.

## Run
1. Start the supplied Spring Boot backend (configured at `http://localhost:8080`).
2. Extract this frontend folder, run `npm install` and `npm run dev`.
3. Open `http://localhost:5173` (if occupied, stop the other Vite instance rather than letting the port change).
4. Test candidate login, HR login, identity inputs, upload of valid/invalid files, and scheduling with two distinct future slots using backend records with required verified documents.
