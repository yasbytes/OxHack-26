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

7. Create the app's tables: open the Supabase SQL editor, paste in `supabase/migrations/20261025000000_app_data.sql` and run it. It's safe to run again.

The browser talks directly to Supabase for login and for its own data. Python is only needed for the quick log.

## Backend (quick log)

The quick log sends free text to the FastAPI app in `backend/`, which checks the user's Supabase login, asks Gemini to pick out the activities, and works out their kg with the same factors as the forms (`backend/app/factors.py`).

```powershell
cd backend
cp .env.example .env   # then fill in the values
pip install -r requirements.txt
cd ..
npm run api
```

`backend/.env` uses the same publishable key as the front end: the API acts as the signed-in user, so row level security still applies. In development Vite forwards `/api` to `http://localhost:8000`. A deployed front end sets `VITE_API_URL` to the API's address, and the API lists that origin in `ALLOWED_ORIGINS`. Without the API, quick logs are still saved, just without an estimate.

Login errors appear in the form. With no usable Supabase configuration, the app runs in browser-only demo mode; those demo accounts do not access Supabase or other users. Use the real project configuration for account testing.

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

Public URLs are `/` (sign in), `/signup`, `/forgot-password`, and `/reset-password`. Private URLs are `/dashboard`, `/dashboard/history`, `/dashboard/insights`, `/dashboard/profile`, `/dashboard/friends`, and `/dashboard/shop`. The app preserves a requested private URL through login, and waits for the initial session check before redirecting. A static production host must rewrite these paths to `index.html` so refreshes work; Vite handles this during development.

Work in `context/AuthContext.tsx` and `components/Signin.tsx` when following the video. Database tables, row-level security and friend functions are defined in `supabase/migrations/20261025000000_app_data.sql`. Run that script in your project before testing data storage. Frontend route guards do not replace the database policies.

## What is stored

Each table in the migration has row level security, so an account can only read and change its own rows.

| Data | Table |
| --- | --- |
| Activity history | `log_items` |
| Profile, monthly limit and cat's name | `profiles` |
| Shop spending, food owned, when the cat was fed | `shop_state` |
| Friends and friend requests | `friendships` |

The browser also keeps a copy per account, so the app opens instantly and keeps working if a request fails. The first time an account syncs, whatever that browser already had for it is uploaded. Friends are added by their username or account email and see each other's weekly and yearly totals once the request is accepted, never individual entries. The totals are worked out in the database (`friends_overview`).

Failed log, profile and shop writes are queued per account in browser storage and retried on login, a new change, reconnecting, or returning to the tab. Keep that browser data until pending changes have synced. Every write explicitly includes its account ID, and failed requests do not get discarded when remote data is loaded. Account history loads in pages so graphs include more than 1,000 entries.

## Using the features

- **Graphs:** log journeys, meals or energy usage on Home. History lets you change the date/details or delete an entry. Insights uses those same dated entries for monthly totals and a year-end projection. Energy bills spread over the days they cover. Entries with no estimate remain in History but contribute neither a footprint estimate nor a reward. The projection extrapolates the recent logging pace; missing logs can understate it.
- **Friends:** set a unique username in Profile. On Friends, enter someone else's username or email. After they accept, the leaderboard compares each person's weekly emissions against their own budget. Only aggregate totals are shared.
- **Shop:** coins reward completed logged days under budget. Buy food in Shop, then feed it to your cat on Home. Spending, inventory and feeding times are saved per account.

Coins are calculated from self-reported logs and the prototype wallet is client-managed; it is not suitable for real-money purchases or tamper-proof competitions. Profile and wallet sync use the last saved state, so avoid editing the same account on two devices at once. Friend lists refresh when the page opens or after a friend action.

## Verify the cloud setup

After running the SQL script, reload the app and sign in with a confirmed account. Add a journey, reload and check History and Insights. Buy food and reload to check inventory. Use two confirmed accounts in separate browser profiles to test sending and accepting a friend request. Before accepting, no footprint totals should be visible. Account A's individual log must never appear in account B's History.

A `PGRST205` or `PGRST202` error means a required table/function is missing from the API schema: run the migration, then reload. The script runs in a transaction and can be rerun against its own schema. Authentication email delivery and redirect allowlists must be configured in the Supabase dashboard.

Demo mode (no Supabase keys) keeps everything in the browser and has no friends, because there are no other accounts.

## Checks

```powershell
npm run build
npm run lint
npm test
```

Auth tests use simulated Supabase responses and do not create real accounts or send confirmation emails. A successful build does not verify the project's email delivery or redirect allowlist.

References: [Supabase React auth](https://supabase.com/docs/guides/auth/quickstarts/react), [API keys](https://supabase.com/docs/guides/api/api-keys).
