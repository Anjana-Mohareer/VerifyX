# Candidate registration 400 validation fix

Backend reference: UserRegistrationDto.java and GlobalExceptionHandler.java.

Modified frontend files:
- src/pages/CandidateRegister.jsx: enforce backend Gmail restriction, password 8-30 chars with uppercase/lowercase/digit/allowed special char, required role/type, trim email/name.
- src/services/apiService.js: show field-specific validation errors returned by the backend for candidate registration only instead of generic Validation failed.

No backend files changed. Existing registration OTP and other flows preserved.

Important: backend additionally calls ZeroBounce email mailbox validation and checks existing emails/phone numbers; a 400 can still occur for those reasons and requires reviewing the actual response body in DevTools Network.

Verification: source-level checks completed. Automated build and live backend test could not be run because dependency installation was unavailable in this runtime.
