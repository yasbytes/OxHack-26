# OxHack-26
Project for OxHack 26

-Python and Supabase for backend
-Javascript and React + vite for frontend 

Steps:
0. python -m venv OxHack
1. OxHack\Scripts\Activate.ps1 (Mac: source OxHack/bin/activate, and use python3 if python isn't found)
2. npm -v (check if npm is there if not download npm [npm create vite@latest carbon-management-app -- --template react])
3. cd carbon-management-app 
4. npm run dev (once you see the local host open it)

- the venv is whichever folder contains pyvenv.cfg

installation
pip install fastapi uvicorn pydantic
python-dotenv supabase google-genai
uvicorn app.main:app --reload

Gemini AI
1. get in ur environment for this to work and install
2. to keep backend running (cd backend, then uvicorn app.main:app --reload)
3. run npm run dev after cd carbon-management-tracker
4. to check the AI enter 'http://localhost:8000' 
5. You need GEMINI_API_KEY in their own backend/.env and must run pip install google-genai.