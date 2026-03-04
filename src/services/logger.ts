type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: number
  level: LogLevel
  tag: string
  message: string
  meta?: any
}

const STORAGE_KEY = 'mg_logs_v1'
const MAX_LOGS = 200

let logs: LogEntry[] = []
let subscribers: Set<(entries: LogEntry[]) => void> = new Set()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch (e) {
    // ignore
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) logs = JSON.parse(raw)
  } catch (e) {
    logs = []
  }
}

load()

function notify() {
  subscribers.forEach(s => s([...logs]))
}

export function getLogs(): LogEntry[] {
  return [...logs]
}

export function clearLogs() {
  logs = []
  persist()
  notify()
}

export function subscribeLogs(cb: (entries: LogEntry[]) => void) {
  subscribers.add(cb)
  cb([...logs])
  return () => subscribers.delete(cb)
}

export function log(level: LogLevel, tag: string, message: string, meta?: any) {
  const e: LogEntry = { ts: Date.now(), level, tag, message, meta }
  logs.unshift(e)
  if (logs.length > MAX_LOGS) logs = logs.slice(0, MAX_LOGS)
  persist()
  notify()

  // also mirror to console
  if (level === 'error') console.error(`[${tag}] ${message}`, meta)
  else if (level === 'warn') console.warn(`[${tag}] ${message}`, meta)
  else console.log(`[${tag}] ${message}`, meta)
}

export default { log, getLogs, clearLogs, subscribeLogs }
