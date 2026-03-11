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
ipcMain.handle('download-video', async (event, { url, filename, format }) => {
  console.log('Download requested for:', url, 'with filename:', filename, 'format:', format)
  
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`
  const downloadsPath = join(app.getPath('downloads'), 'DPlus', dateStr)
  
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true })
  }

  // Robust path resolution for yt-dlp binary
  const ytDlpConstants = require('yt-dlp-exec/src/constants')
  let ytDlpPath = path.normalize(ytDlpConstants.YOUTUBE_DL_PATH)
  
  if (app.isPackaged) {
    ytDlpPath = ytDlpPath.replace(/[\\/]app\.asar[\\/]/i, (match) => match.replace('app.asar', 'app.asar.unpacked'))
  }
  
  if (!fs.existsSync(ytDlpPath)) {
    return { success: false, message: `Downloader binary not found at: ${ytDlpPath}` }
  }

  const outputTemplate = filename 
    ? join(downloadsPath, `${filename}.%(ext)s`)
    : join(downloadsPath, '%(title)s.%(ext)s')

  // Use selected format or best quality
  const formatArg = format || 'bestvideo+bestaudio/best'

  return new Promise((resolve) => {
    try {
      const process = spawn(ytDlpPath, [
        url,
        '-f', formatArg,
        '-o', outputTemplate,
        '--no-check-certificate',
        '--no-warnings',
        '--progress',
        '--extractor-args', 'youtube:player_client=android,web'
      ])

      process.on('error', (err) => {
        resolve({ success: false, message: `Failed to start downloader: ${err.message}` })
      })

      process.stdout.on('data', (data) => {
        const text = data.toString()
        const matches = text.matchAll(/(\d+(\.\d+)?)%/g)
        let lastProgress = -1
        for (const match of matches) {
          lastProgress = parseFloat(match[1])
        }
        if (lastProgress !== -1) {
          event.sender.send('download-progress', lastProgress)
        }
      })

      let stderr = ''
      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          shell.openPath(downloadsPath)
          resolve({ success: true, message: 'Download finished' })
        } else {
          resolve({ success: false, message: stderr || `Download failed with code ${code}` })
        }
      })
    } catch (err: any) {
      resolve({ success: false, message: `Spawn error: ${err.message}` })
    }
  })
})

ipcMain.handle('get-video-metadata', async (_event, url) => {
  const ytDlpConstants = require('yt-dlp-exec/src/constants')
  let ytDlpPath = path.normalize(ytDlpConstants.YOUTUBE_DL_PATH)

  if (app.isPackaged) {
    ytDlpPath = ytDlpPath.replace(/[\\/]app\.asar[\\/]/i, (match) => match.replace('app.asar', 'app.asar.unpacked'))
  }

  return new Promise((resolve) => {
    const fetchMetadata = (useFlatPlaylist: boolean) => {
      const args = [url, '-j', '--no-check-certificate', '--extractor-args', 'youtube:player_client=android,web']
      if (useFlatPlaylist) {
        args.push('--flat-playlist')
      }

      const process = spawn(ytDlpPath, args)
      let output = ''
      let errorOutput = ''

      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      process.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      process.on('error', (err) => {
        resolve({ success: false, message: `Metadata fetch error: ${err.message}` })
      })

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const data = JSON.parse(output)
            const isPlaylist = data._type === 'playlist' || (data.entries && Array.isArray(data.entries))
            
            if (isPlaylist) {
              const entries = data.entries.map((entry: any) => ({
                id: entry.id || entry.url,
                title: entry.title,
                url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`
              }))
              resolve({
                success: true,
                isPlaylist: true,
                title: data.title || 'Playlist',
                entries: entries
              })
            } else {
              const formats = (data.formats || [])
                .filter((f: any) => f.vcodec !== 'none' && f.resolution !== 'multiple')
                .map((f: any) => ({
                  id: f.format_id as string,
                  label: (f.resolution || f.format_note || f.format) as string,
                  ext: f.ext as string,
                  filesize: f.filesize as number
                }))
                .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.label === v.label) === i)
                .reverse()

              resolve({ 
                success: true, 
                isPlaylist: false,
                title: data.title,
                formats: formats.slice(0, 10)
              })
            }
          } catch (e) {
            if (useFlatPlaylist) {
              fetchMetadata(false)
            } else {
              resolve({ success: false, message: 'Failed to parse metadata' })
            }
          }
        } else {
          if (useFlatPlaylist) {
            fetchMetadata(false)
          } else {
            resolve({ success: false, message: errorOutput || 'Could not fetch metadata' })
          }
        }
      })
    }

    try {
      fetchMetadata(true)
    } catch (err: any) {
      resolve({ success: false, message: `Metadata spawn error: ${err.message}` })
    }
  })
})

ipcMain.handle('download-batch', async (event, { videos, qualityPreference }) => {
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`
  const downloadsPath = join(app.getPath('downloads'), 'DPlus', dateStr)
  
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true })
  }

  const ytDlpConstants = require('yt-dlp-exec/src/constants')
  let ytDlpPath = path.normalize(ytDlpConstants.YOUTUBE_DL_PATH)
  if (app.isPackaged) {
    ytDlpPath = ytDlpPath.replace(/[\\/]app\.asar[\\/]/i, (match) => match.replace('app.asar', 'app.asar.unpacked'))
  }

  // Quality preference logic
  const height = qualityPreference || '1080'
  const filter = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`

  let completed = 0
  const total = videos.length

  for (const video of videos) {
    const outputTemplate = join(downloadsPath, `${video.title}.%(ext)s`)
    
    await new Promise((resolve) => {
      try {
        const process = spawn(ytDlpPath, [
          video.url,
          '-f', filter,
          '-o', outputTemplate,
          '--no-check-certificate',
          '--no-warnings',
          '--progress',
          '--extractor-args', 'youtube:player_client=android,web'
        ])

        process.stdout.on('data', (data) => {
          const text = data.toString()
          const matches = text.matchAll(/(\d+(\.\d+)?)%/g)
          let lastProgress = -1
          for (const match of matches) {
            lastProgress = parseFloat(match[1])
          }
          if (lastProgress !== -1) {
            // Send overall progress: (finished items + current item progress) / total
            const overallProgress = ((completed + (lastProgress / 100)) / total) * 100
            event.sender.send('download-progress', overallProgress)
          }
        })

        process.on('close', () => {
          completed++
          resolve(true)
        })
      } catch (err) {
        completed++
        resolve(false)
      }
    })
  }

  shell.openPath(downloadsPath)
  return { success: true, message: 'Batch download finished' }
})

