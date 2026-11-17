#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32'

const targets = {
  store: {
    label: 'store',
    color: '\x1b[36m',
    cwd: 'storefront',
    command: 'npm',
    args: ['run', 'dev'],
    port: 5173,
  },
  admin: {
    label: 'admin',
    color: '\x1b[35m',
    cwd: 'admin',
    command: 'npm',
    args: ['run', 'dev'],
    port: 5174,
  },
  api: {
    label: 'api  ',
    color: '\x1b[33m',
    cwd: '.',
    command: 'dotnet',
    args: ['run', '--project', 'backend/Eclipse.Api'],
    port: 8090,
  },
}

const requested = process.argv.slice(2)
const selected = requested.length > 0 ? requested : ['store', 'admin']

const unknown = selected.filter((name) => !targets[name])
if (unknown.length > 0) {
  console.error(`Procesos desconocidos: ${unknown.join(', ')}`)
  console.error(`Disponibles: ${Object.keys(targets).join(', ')}`)
  process.exit(1)
}

function canBind(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once('error', (error) => resolve(error.code !== 'EADDRINUSE'))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, host)
  })
}

async function isPortFree(port) {
  return (await canBind(port, '127.0.0.1')) && (await canBind(port, '::'))
}

function pidsOnPort(port) {
  if (!isWindows) return []
  try {
    const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' })
    const pids = new Set()
    for (const line of output.split(/\r?\n/)) {
      const columns = line.trim().split(/\s+/)
      if (columns.length < 5 || columns[3] !== 'LISTENING') continue
      if (!(columns[1] ?? '').endsWith(`:${port}`)) continue
      if (/^\d+$/.test(columns[4])) pids.add(columns[4])
    }
    return [...pids]
  } catch {
    return []
  }
}

function commandLineOf(pid) {
  if (!isWindows) return ''
  try {
    return execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
      ],
      { encoding: 'utf8' },
    ).trim()
  } catch {
    return ''
  }
}

function belongsToProject(commandLine) {
  if (!commandLine) return false
  return commandLine.toLowerCase().replace(/\//g, '\\').includes(root.toLowerCase())
}

function stopProcess(pid) {
  try {
    if (isWindows) {
      execFileSync('taskkill', ['/pid', pid, '/T', '/F'], { stdio: 'ignore' })
    } else {
      process.kill(Number(pid), 'SIGTERM')
    }
    return true
  } catch {
    return false
  }
}

async function freePorts(names) {
  for (const name of names) {
    const { label, port, color } = targets[name]
    if (await isPortFree(port)) continue

    const pids = pidsOnPort(port)
    const stale = pids.filter((pid) => belongsToProject(commandLineOf(pid)))

    if (stale.length === 0) {
      console.error(
        `${color}[${label}]\x1b[0m el puerto ${port} está ocupado por otro programa (PID ${pids.join(', ') || 'desconocido'}).`,
      )
      console.error('         Cierra ese programa antes de iniciar Eclipse.')
      process.exit(1)
    }

    for (const pid of stale) {
      console.log(`${color}[${label}]\x1b[0m liberando puerto ${port} (instancia previa PID ${pid})…`)
      stopProcess(pid)
    }

    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (await isPortFree(port)) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    if (!(await isPortFree(port))) {
      console.error(`${color}[${label}]\x1b[0m no se pudo liberar el puerto ${port}.`)
      process.exit(1)
    }
  }
}

await freePorts(selected)

let shuttingDown = false
let running = selected.length
const children = []

function prefixOutput(stream, target) {
  let buffer = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      process.stdout.write(`${target.color}[${target.label}]\x1b[0m ${line}\n`)
    }
  })
  stream.on('end', () => {
    if (buffer.length > 0) {
      process.stdout.write(`${target.color}[${target.label}]\x1b[0m ${buffer}\n`)
    }
  })
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (child.exitCode !== null || child.killed) continue
    if (isWindows) {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
  }
  setTimeout(() => process.exit(code), 400)
}

for (const name of selected) {
  const target = targets[name]
  console.log(`${target.color}[${target.label}]\x1b[0m iniciando…`)

  const child = spawn(target.command, target.args, {
    cwd: path.join(root, target.cwd),
    shell: isWindows,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  children.push(child)
  if (child.stdout) prefixOutput(child.stdout, target)
  if (child.stderr) prefixOutput(child.stderr, target)

  child.on('error', (error) => {
    console.error(`${target.color}[${target.label}]\x1b[0m no se pudo iniciar: ${error.message}`)
    running -= 1
    if (running === 0) shutdown(1)
  })

  child.on('exit', (code) => {
    if (shuttingDown) return
    running -= 1
    console.error(`${target.color}[${target.label}]\x1b[0m terminó con código ${code ?? 0}`)
    if (running === 0) shutdown(code ?? 0)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('SIGHUP', () => shutdown(0))
