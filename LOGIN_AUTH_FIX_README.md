# VerifyX Login / Remember Me Fixes

- Restored Remember Me on both Candidate and HR login.
- Fixed API authorization header to use the same token source as the login flow.
- Persists a server-issued token and non-sensitive session metadata in sessionStorage (unchecked) or localStorage (checked). No password is stored.
- Clears obsolete verifyx_token entries to avoid stale requests.
- Excludes an authorization header from public login requests.
- Preserved existing login validation, reset password, candidate profile navigation, and other pages.

Test with running backend: login, protected /api/candidate/profile, refresh, new tab, browser restart, logout, wrong password, unknown email, candidate/HR routes, and OTP flows. Remember Me stores a bearer token on the device: only use it on trusted devices.
