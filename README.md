# OxHack-26 · Carbon Management Tracker

Project for OxHack 26. Track your carbon footprint, see where it comes from, forecast your year, and ask Gemini for greener travel advice.
## Team

| Name | Role | What they built |
|---|---|---|
| **Nina** | Backend & AI | Backend: Python and Supabase, Gemini API setup |
| **Yasmine** | Fullstack | Frontend: React + Vite, Backend: Supabase |
| **Sabrina** | Frontend & Figma Design | React + Vite and ElevenLabs |
| **Amal** | Backend | Python and Supabase |

## Tech stack

 Backend : Python, FastAPI, Supabase, Gemini API,  
 Frontend : TypeScript, React, Vite 

## Instructions

### 1. One-time setup

**Create and activate the Python environment**

```
python -m venv OxHack
OxHack\Scripts\Activate.ps1
```

- Mac/Linux: `source OxHack/bin/activate` (use `python3` if `python` isn't found).
- You'll know it worked when `(OxHack)` appears at the start of your terminal prompt.
- The environment folder is whichever one contains `pyvenv.cfg`.

**Install the backend packages**

```
pip install fastapi uvicorn pydantic python-dotenv supabase google-genai
```

**Install the frontend packages**

```
npm install
```

If `npm` isn't found, install Node.js first and check with `npm -v`.

**Add your secret keys**

Copy `backend/.env.example` to `backend/.env` and add in:

```
GEMINI_API_KEY=your_key_here
```

plus the Supabase keys. Everyone needs their own `.env`. **Never commit it**, because it holds private keys.

### 2. Run the app (two terminals)

**Terminal 1: backend**

```
OxHack\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload
```

**Terminal 2: frontend**

```
cd carbon-management-tracker
npm run dev
```

Open the link it prints

## Ask Gemini (AI advice)

The Home page has an **Ask Gemini** box. Ask about a journey ("train from Manchester to London?") or any carbon question, and it replies with advice and a comparison of options.

To test the backend on its own:

1. Make sure the backend is running.
2. Open http://localhost:8000/docs
3. Choose `POST /api/journey`, click **Try it out**, and send:
   ```json
   {"question": "train from Manchester to London"}
   ```

Emission numbers come from fixed factors in the backend, not from Gemini.

## Troubleshooting

| Problem | Fix |
|---|---|
| If `uvicorn` is not recognized | The environment isn't active. Look for `(OxHack)` in the prompt and run the activate command again. |
| PowerShell blocks the activate script | Run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once. |
| `GEMINI_API_KEY not found` | Add it to `backend/.env` and restart the backend. |
| Gemini says the model is not found | Google retired the model. Update `MODEL` in `backend/app/ai.py`. |

