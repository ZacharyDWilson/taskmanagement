// Starts the basic build (http://localhost:5173) and the admin dev build (http://localhost:5174)
// side by side. Ctrl-C stops both.
import { spawn } from 'node:child_process'

const servers = [
  { name: 'basic', script: 'dev:basic' },
  { name: 'admin', script: 'dev:admin' },
]

const children = servers.map(({ name, script }) => {
  const child = spawn('npm', ['run', script], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const tag = chunk => String(chunk).split(/\r?\n/).filter(Boolean).map(l => `[${name}] ${l}`).join('\n') + '\n'
  child.stdout.on('data', c => process.stdout.write(tag(c)))
  child.stderr.on('data', c => process.stderr.write(tag(c)))
  child.on('exit', code => console.log(`[${name}] stopped (${code})`))
  return child
})

const stop = () => { children.forEach(c => c.kill()); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
