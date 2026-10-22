# VerifyX login negative test-case corrections

Based on supplied `Verifyx login page.pdf` (LOG_001–LOG_023).

- LOG_002, LOG_003, LOG_004, LOG_017, LOG_018: required-field messages are shown inline for email/password; empty submission does not call the backend.
- LOG_007, LOG_008: malformed email and whitespace-only email are rejected.
- LOG_009: whitespace-only password is rejected before API submission; valid passwords are not trimmed or case-changed.
- **LOG_005**: unregistered-email login failures (including HTTP 400, 401, 403, 404 or 422, or backend credential-rejection messages) display consistent `Invalid email address or password. Please try again.`
- LOG_006, LOG_012: incorrect passwords use the same safe generic login error; password case is preserved.
- LOG_010: password remains masked by default, with existing visibility toggle unchanged.
- LOG_011, LOG_016: email is trimmed and lowercased, password is preserved as typed.
- Prevent duplicate submissions while login is processing and provide accessible inline validation (`aria-invalid`, `role=alert`).

Only `src/pages/Login.jsx`, `src/pages/Login.css`, `src/services/authService.js` were modified. Other app pages and APIs are unchanged.

**Testing note:** The uploaded PDF marks LOG_005 Fail, the other listed test cases Pass. Client-side validation is implemented, but a live backend with known registered and unregistered accounts is needed to confirm end-to-end results. The frontend cannot independently prove an email is unregistered; the server must reject invalid credentials.
