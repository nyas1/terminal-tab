/**
 * Run package_addon.py with python / python3 / py -3 (Windows).
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const attempts = ['python package_addon.py', 'python3 package_addon.py', 'py -3 package_addon.py']

for (const cmd of attempts) {
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit', shell: true })
    process.exit(0)
  } catch {
    /* try next */
  }
}
console.error('Could not run package_addon.py. Install Python 3 and ensure `python` or `python3` is on PATH.')
process.exit(1)
