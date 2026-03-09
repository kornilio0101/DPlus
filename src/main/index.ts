import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path, { join } from 'path'
import ytDlp from 'yt-dlp-exec'
import fs from 'fs'

// isDev will be checked inside functions

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    title: 'DPlus - Video Downloader'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import { spawn } from 'child_process'

// IPC handlers for downloading
ipcMain.handle('download-video', async (event, { url, filename }) => {
  console.log('Download requested for:', url, 'with filename:', filename)
  
  const downloadsPath = join(app.getPath('downloads'), 'DPlus')
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true })
  }

  // Robust path resolution for yt-dlp binary
  const ytDlpConstants = require('yt-dlp-exec/src/constants')
  let ytDlpPath = path.normalize(ytDlpConstants.YOUTUBE_DL_PATH)
  
  if (app.isPackaged) {
    // More robust replacement for packaged environments
    ytDlpPath = ytDlpPath.replace(/[\\/]app\.asar[\\/]/i, (match) => match.replace('app.asar', 'app.asar.unpacked'))
  }
  
  console.log('Final yt-dlp path:', ytDlpPath)

  if (!fs.existsSync(ytDlpPath)) {
    console.error('yt-dlp binary search failed at:', ytDlpPath)
    return { success: false, message: `Downloader binary not found at: ${ytDlpPath}` }
  }

  const outputTemplate = filename 
    ? join(downloadsPath, `${filename}.%(ext)s`)
    : join(downloadsPath, '%(title)s.%(ext)s')

  return new Promise((resolve) => {
    try {
      const process = spawn(ytDlpPath, [
        url,
        '-o', outputTemplate,
        '--no-check-certificate',
        '--no-warnings',
        '--progress'
      ])

      process.on('error', (err) => {
        console.error('Failed to spawn yt-dlp:', err)
        resolve({ success: false, message: `Failed to start downloader: ${err.message}` })
      })

      process.stdout.on('data', (data) => {
        const line = data.toString()
        const match = line.match(/(\d+(\.\d+)?)%/)
        if (match) {
          const progress = parseFloat(match[1])
          event.sender.send('download-progress', progress)
        }
      })

      let stderr = ''
      process.stderr.on('data', (data) => {
        stderr += data.toString()
        console.error(`yt-dlp stderr: ${data}`)
      })

      process.on('close', (code) => {
        if (code === 0) {
          shell.openPath(downloadsPath)
          resolve({ success: true, message: 'Download finished' })
        } else {
          console.error('yt-dlp failed with code', code, 'stderr:', stderr)
          resolve({ success: false, message: stderr || `Download failed with code ${code}` })
        }
      })
    } catch (err: any) {
      console.error('Synchronous spawn error:', err)
      resolve({ success: false, message: `Spawn error: ${err.message}` })
    }
  })
})

ipcMain.handle('get-video-title', async (_event, url) => {
  const ytDlpConstants = require('yt-dlp-exec/src/constants')
  let ytDlpPath = path.normalize(ytDlpConstants.YOUTUBE_DL_PATH)

  if (app.isPackaged) {
    ytDlpPath = ytDlpPath.replace(/[\\/]app\.asar[\\/]/i, (match) => match.replace('app.asar', 'app.asar.unpacked'))
  }

  return new Promise((resolve) => {
    try {
      const process = spawn(ytDlpPath, [url, '--get-title', '--no-check-certificate'])
      let title = ''
      process.stdout.on('data', (data) => {
        title += data.toString()
      })
      process.on('error', (err) => {
        console.error('Failed to spawn title fetcher:', err)
        resolve({ success: false, message: `Spawn error: ${err.message}` })
      })
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, title: title.trim() })
        } else {
          resolve({ success: false, message: 'Could not fetch title' })
        }
      })
    } catch (err: any) {
      resolve({ success: false, message: `Title fetch error: ${err.message}` })
    }
  })
})

