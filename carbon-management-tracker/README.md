# Future Earth

A React + TypeScript carbon tracker with Supabase email/password authentication.

## Run locally

Open this local folder in VS Code (not the virtual GitHub workspace).

```powershell
npm install
npm run dev
```

Open the exact Local URL printed by Vite.

## Supabase setup

1. Copy `.env.example` to `.env.local` beside `package.json`.
2. From your project's Connect dialog, copy the project URL and publishable key into those variables. A legacy anon key also works. Never put a secret or service-role key in a `VITE_` variable.
3. Restart `npm run dev` after changing environment settings.
4. In Supabase Authentication, enable the Email provider. Keep email confirmation enabled if you want users to verify their email addresses.
5. Under Authentication > URL Configuration, add your local app origin (for example `http://localhost:5173`) to Redirect URLs. Set Site URL to your app's intended URL. Add the production URL before deploying.
6. Use Sign up, confirm the email if required, then log in. Profile > Log out ends the session in this browser.

The browser talks directly to Supabase Auth. Python is not needed for login. The Python backend has separate environment settings and is not wired to these forms.

Login errors appear in the form. Missing or invalid local settings disable submission and print a setup error in the development console instead of crashing the app.

## Following the video

This app follows the auth and routing structure in [Intro to Supabase](https://www.youtube.com/watch?v=Q7P20fHJlm4). It uses TypeScript (`.tsx`) and the carbon-tracker interface rather than the course's sales dashboard.

| Video chapter | File in this project |
| --- | --- |
| 1:02:10 Router setup | `src/router.tsx`, `src/routes.tsx`, `src/main.tsx` |
| 1:10:35 Context API and 1:18:38 session state | `src/context/AuthContext.tsx` |
| 1:47:58 Sign in component | `src/components/Signin.tsx` |
| 2:00:57 Sign in auth function | `signInUser` in `src/context/AuthContext.tsx` |
| 2:11:43 Navigate and Link | `Signin.tsx`, `Signup.tsx`, and `App.tsx` |
| 2:18:21 Sign out | `src/components/Signout.tsx` and `signOutUser` in the context |
| 2:43:19 Home redirect | `src/routes/Home.tsx` |
| 2:52:13 Protected Route | `src/routes/ProtectedRoute.tsx` |
| 2:58:53 Sign up | `src/components/Signup.tsx` and `signUpUser` in the context |

`main.tsx` wraps `RouterProvider` in `AuthContextProvider`. Forms use `useActionState`, read `FormData`, and call auth functions from `useAuth()`. Supabase calls live in the provider; `src/supabase-client.ts` remains the single client configuration file.

Public URLs are `/` (sign in) and `/signup`. Private URLs are `/dashboard`, `/dashboard/history`, `/dashboard/insights`, and `/dashboard/profile`. The app preserves a requested private URL through login, and waits for the initial session check before redirecting. A static production host must rewrite these paths to `index.html` so refreshes work; Vite handles this during development.

The previous `src/useAuth.ts` and `src/pages/LoginPage.tsx` now only re-export the new implementations for compatibility. Work in `context/AuthContext.tsx` and `components/Signin.tsx` when following the video. The tutorial's RLS, database storage, profile tables, and triggers are still future work; frontend route guards do not replace those policies.

## What is stored

Supabase stores accounts and manages sessions. The SDK restores the signed-in session after a refresh. Names are saved as user metadata for display only.

Activity history is still browser-local, now stored separately by account ID. Existing anonymous demo history is left untouched under `carbon-log`; it is not automatically assigned to a newly created account. This is browser storage, not a secure database or cross-device sync. The dashboard's emissions figures remain sample data.

Before connecting activity tables, enforce Row Level Security and policies using `auth.uid()`; a frontend login screen is not database authorization.

## Checks

```powershell
npm run build
npm run lint
npm test
```

Auth tests use simulated Supabase responses and do not create real accounts or send confirmation emails. A successful build does not verify the project's email delivery or redirect allowlist.

References: [Supabase React auth](https://supabase.com/docs/guides/auth/quickstarts/react), [API keys](https://supabase.com/docs/guides/api/api-keys).
