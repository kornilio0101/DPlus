import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import ytDlp from 'yt-dlp-exec'
import fs from 'fs'

process.env.DIST = join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(__dirname, '../public')

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
    title: 'DPlus - Video Downloader',
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL as string)
  } else {
    win.loadFile(join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// IPC handlers for downloading
ipcMain.handle('download-video', async (event, url) => {
  console.log('Download requested for:', url)
  
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`
  const downloadsPath = join(app.getPath('downloads'), 'DPlus', dateStr)
  
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true })
  }

  try {
    const output = await ytDlp(url, {
      output: join(downloadsPath, '%(title)s.%(ext)s'),
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ],
    })
    
    // Open the downloads folder
    shell.openPath(downloadsPath)
    
    return { success: true, message: 'Download finished', output }
  } catch (err: any) {
    console.error('Download error:', err)
    return { success: false, message: err.message || 'Unknown error' }
  }
})
