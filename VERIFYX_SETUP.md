# VerifyX API integration setup

## Backend

The Roles and Candidate Type dropdown calls `GET /api/auth/registration-options` (public endpoint). The backend returns an `ApiResponse` with `data.appliedRoles` and `data.candidateTypes`. This endpoint is already implemented in `AuthController`. No static role list is used in the frontend.

In the backend environment, configure required variables used by `application.properties` (database, JWT, mail, etc.). Set `CORS_ALLOWED_ORIGINS` to the comma-separated **exact** frontend origins, e.g. `http://localhost:5173,https://YOUR-PROJECT.vercel.app`. Do not include trailing slashes. The localhost default is for development only.

## Frontend

For local development, copy `.env.example` to `.env` and set `VITE_API_BASE_URL=http://localhost:8080`, then run `npm ci` and `npm run dev` in the frontend folder. On Vercel, set `VITE_API_BASE_URL` to the **public HTTPS** address of the running backend (not localhost, and no /api suffix), and redeploy.

Test the public API URL directly: `https://YOUR-BACKEND/api/auth/registration-options`. Expect `{success:true,data:{appliedRoles:[...],candidateTypes:[...]}}`. If it fails, the UI cannot load roles, and you must first fix backend startup, its database/environment, or network access. If URL works in a browser but the frontend request fails, inspect browser developer tools for CORS response errors and check `CORS_ALLOWED_ORIGINS`.

## Limitations

This patch addresses API connection diagnostics and deployable CORS configuration. It does not invent missing persistence endpoints; draft/notification compatibility state remains memory-only in the previously supplied storage-free frontend. It is **not** a verified end-to-end migration. A full production build and runtime validation require installing npm dependencies and a running configured backend.
