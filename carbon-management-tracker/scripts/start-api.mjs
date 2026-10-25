import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const backend = fileURLToPath(new URL('../backend/', import.meta.url))
const python = join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
if (!existsSync(python)) {
  console.error('Set up Python first (from the project folder):\n  py -m venv backend/.venv\n  backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt')
  process.exit(1)
}
const server = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--port', '8000', ...process.argv.slice(2)], {
  cwd: backend, stdio: 'inherit',
})
server.on('error', (error) => { console.error(`Could not start Python: ${error.message}`); process.exitCode = 1 })
server.on('exit', (code) => { process.exitCode = code ?? 0 })
process.on('SIGINT', () => server.kill('SIGINT'))
process.on('SIGTERM', () => server.kill('SIGTERM'))
