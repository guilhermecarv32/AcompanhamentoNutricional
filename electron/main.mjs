import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

/** Tudo de dados do app fica no D:, nunca no userData padrão do Windows (C:). */
const APP_ROOT = isDev
  ? path.resolve(__dirname, '..')
  : path.dirname(process.execPath)
const DATA_DIR = path.join(APP_ROOT, 'data')
const DB_PATH = path.join(DATA_DIR, 'nutri.db')

fs.mkdirSync(DATA_DIR, { recursive: true })

/** @type {import('sql.js').Database | null} */
let db = null
/** @type {import('sql.js').SqlJsStatic | null} */
let SQL = null

function persist() {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function runMigrations(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diet_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diet_meal_foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diet_meal_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL CHECK (unit IN ('g', 'unidade')),
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      FOREIGN KEY (diet_meal_id) REFERENCES diet_meals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      diet_meal_id INTEGER,
      logged_at TEXT NOT NULL,
      day TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (diet_meal_id) REFERENCES diet_meals(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS meal_log_foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_log_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL CHECK (unit IN ('g', 'unidade')),
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      FOREIGN KEY (meal_log_id) REFERENCES meal_logs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS body_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now')),
      body_fat_pct REAL,
      height_cm REAL,
      waist_cm REAL,
      hip_cm REAL,
      arm_cm REAL,
      chest_cm REAL,
      notes TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now')),
      day TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 1,
      activity TEXT,
      duration_min REAL,
      notes TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      hours REAL,
      quality INTEGER,
      notes TEXT,
      logged_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `)
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null
}

async function initDatabase() {
  const initSqlJs = require('sql.js')
  const wasmPath = path.join(
    APP_ROOT,
    'node_modules',
    'sql.js',
    'dist',
    'sql-wasm.wasm',
  )
  SQL = await initSqlJs({
    locateFile: () => wasmPath,
  })

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON;')
  runMigrations(db)
  persist()
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#f42902',
    title: 'Acompanhamento Nutricional',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(APP_ROOT, 'dist', 'index.html'))
  }
}

function registerIpc() {
  ipcMain.handle('db:profiles:list', () => {
    return queryAll(
      `SELECT id, name, created_at, updated_at
       FROM profiles
       ORDER BY name COLLATE NOCASE ASC`,
    )
  })

  ipcMain.handle('db:profiles:create', (_event, name) => {
    const trimmed = String(name ?? '').trim()
    if (!trimmed) throw new Error('Nome do perfil é obrigatório.')

    try {
      db.run(
        `INSERT INTO profiles (name, created_at, updated_at)
         VALUES (?, datetime('now'), datetime('now'))`,
        [trimmed],
      )
      persist()
      return queryOne(`SELECT id, name, created_at, updated_at FROM profiles WHERE id = last_insert_rowid()`)
    } catch (error) {
      if (String(error?.message ?? error).includes('UNIQUE')) {
        throw new Error('Já existe um perfil com esse nome.')
      }
      throw error
    }
  })

  ipcMain.handle('db:profiles:rename', (_event, { id, name }) => {
    const trimmed = String(name ?? '').trim()
    if (!trimmed) throw new Error('Nome do perfil é obrigatório.')
    db.run(
      `UPDATE profiles SET name = ?, updated_at = datetime('now') WHERE id = ?`,
      [trimmed, id],
    )
    persist()
    return queryOne(`SELECT id, name, created_at, updated_at FROM profiles WHERE id = ?`, [id])
  })

  ipcMain.handle('db:profiles:delete', (_event, id) => {
    db.run(`DELETE FROM profiles WHERE id = ?`, [id])
    persist()
    return { ok: true }
  })

  ipcMain.handle('db:settings:get', (_event, key) => {
    const row = queryOne(`SELECT value FROM app_settings WHERE key = ?`, [key])
    return row?.value ?? null
  })

  ipcMain.handle('db:settings:set', (_event, { key, value }) => {
    db.run(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, String(value)],
    )
    persist()
    return { ok: true }
  })

  ipcMain.handle('app:getPaths', () => ({
    dataDir: DATA_DIR,
    dbPath: DB_PATH,
  }))
}

app.whenReady().then(async () => {
  // Reforça: não usar pastas padrão no C:
  app.setPath('userData', DATA_DIR)
  app.setPath('sessionData', path.join(DATA_DIR, 'session'))
  app.setPath('cache', path.join(DATA_DIR, 'cache'))

  await initDatabase()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  persist()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  persist()
})
