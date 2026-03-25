import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join, resolve as pathResolve } from 'path'
import ytDlp from 'yt-dlp-exec'
import fs from 'fs'
import { spawn } from 'child_process'

const isDev = !app.isPackaged;

// Robust path resolution for yt-dlp binary and ffmpeg
const ytDlpPath = isDev
  ? pathResolve('node_modules/yt-dlp-exec/bin/yt-dlp.exe')
  : join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp.exe');

const ffmpegPath = isDev
  ? pathResolve('node_modules/ffmpeg-static/ffmpeg.exe')
  : join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');

// isDev will be checked inside functions
function sanitizeFilename(filename: string): string {
  // Replace forbidden characters with spaces or underscores
  // Forbidden on Windows: / \ : * ? " < > |
  return filename.replace(/[\\\/:*?"<>|]/g, ' ').substring(0, 150).trim();
}

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


// IPC handlers for downloading
ipcMain.handle('download-video', async (event, { url, filename, format }) => {
  console.log('Download requested for:', url, 'with filename:', filename, 'format:', format)
  
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}`
  const downloadsPath = join(app.getPath('downloads'), 'DPlus', dateStr)
  
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true })
  }

  if (!fs.existsSync(ytDlpPath)) {
    return { success: false, message: `Downloader binary not found at: ${ytDlpPath}` }
  }
  if (!fs.existsSync(ffmpegPath)) {
    return { success: false, message: `FFmpeg binary not found at: ${ffmpegPath}` }
  }

  const safeFilename = filename ? sanitizeFilename(filename) : null;
  const outputTemplate = safeFilename 
    ? join(downloadsPath, `${safeFilename}.%(ext)s`)
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
        '--ffmpeg-location', ffmpegPath,
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
  if (!fs.existsSync(ytDlpPath)) {
    return { success: false, message: `Downloader binary not found at: ${ytDlpPath}` }
  }

  return new Promise((resolve) => {
    const fetchMetadata = (useFlatPlaylist: boolean) => {
      const args = [url, '-j', '--no-check-certificate', '--dump-single-json', '--extractor-args', 'youtube:player_client=android,web']
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
            const lines = output.trim().split(/\r?\n/).filter(line => line.startsWith('{'));
            
            if (lines.length === 0) {
              if (useFlatPlaylist) return fetchMetadata(false);
              return resolve({ success: false, message: 'No metadata found' });
            }

            if (lines.length > 1) {
              // Handle multi-line output (multiple separate JSON objects)
              const rawEntries = lines.map((line, index) => {
                const entry = JSON.parse(line);
                const isTwitter = entry.extractor === 'twitter' || entry.extractor_key === 'Twitter' || url.includes('x.com') || url.includes('twitter.com');
                
                return {
                  id: entry.id || entry.url || `index-${index}`,
                  title: entry.title || `Video ${index + 1}`,
                  url: isTwitter ? url : (entry.url || url),
                  thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails.length > 0 ? entry.thumbnails[entry.thumbnails.length - 1].url : null),
                  index: entry.playlist_index || index + 1
                };
              });

              // Deduplicate by id
              const seen = new Set();
              const entries = rawEntries.filter(e => {
                if (seen.has(e.id)) return false;
                seen.add(e.id);
                return true;
              });

              if (entries.length === 1) {
                // Single unique video — treat as single video, not playlist
                const single = entries[0];
                resolve({
                  success: true,
                  isPlaylist: false,
                  title: single.title,
                  formats: [],
                  thumbnail: single.thumbnail
                });
              } else {
                resolve({
                  success: true,
                  isPlaylist: true,
                  title: 'Playlist',
                  entries: entries
                });
              }
            } else {
              // Standard single JSON object output
              const data = JSON.parse(lines[0]);
              const isPlaylist = data._type === 'playlist' || (data.entries && Array.isArray(data.entries));
              
              if (isPlaylist && data.entries && data.entries.length > 0) {
                const isTwitter = data.extractor === 'twitter' || data.extractor_key === 'Twitter' || url.includes('x.com') || url.includes('twitter.com');
                
                const entries = data.entries.map((entry: any, index: number) => ({
                  id: entry.id || entry.url || `index-${index}`,
                  title: entry.title || `Video ${index + 1}`,
                  url: isTwitter ? url : (entry.url || entry.webpage_url || url),
                  thumbnail: entry.thumbnail || (entry.thumbnails && entry.thumbnails.length > 0 ? entry.thumbnails[entry.thumbnails.length - 1].url : null),
                  index: entry.playlist_index || index + 1
                }));
                resolve({
                  success: true,
                  isPlaylist: true,
                  title: data.title || 'Playlist',
                  entries: entries
                });
              } else if (isPlaylist && (!data.entries || data.entries.length === 0) && useFlatPlaylist) {
                // If it claims to be a playlist but has no entries, try non-flat
                fetchMetadata(false);
              } else {
                // Single video or playlist with no entries treated as single
                const formats = (data.formats || [])
                  .filter((f: any) => f.vcodec !== 'none' && f.resolution !== 'multiple')
                  .map((f: any) => ({
                    id: f.format_id as string,
                    label: (f.resolution || f.format_note || f.format) as string,
                    ext: f.ext as string,
                    filesize: f.filesize as number
                  }))
                  .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.label === v.label) === i)
                  .reverse();

                resolve({ 
                  success: true, 
                  isPlaylist: false,
                  title: data.title,
                  formats: formats.slice(0, 10)
                });
              }
            }
          } catch (e) {
            if (useFlatPlaylist) {
              fetchMetadata(false);
            } else {
              resolve({ success: false, message: 'Failed to parse metadata' });
            }
          }
        } else {
          if (useFlatPlaylist) {
            fetchMetadata(false);
          } else {
            resolve({ success: false, message: errorOutput || 'Could not fetch metadata' });
          }
        }
      });
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

  // Quality preference logic
  const height = qualityPreference || '1080'
  const filter = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`

  let completed = 0
  const total = videos.length

  for (const video of videos) {
    const safeTitle = sanitizeFilename(video.title)
    const outputTemplate = join(downloadsPath, `${safeTitle}.%(ext)s`)
    
    await new Promise((resolve) => {
      try {
        const args = [
          video.url,
          '-f', filter,
          '-o', outputTemplate,
          '--no-check-certificate',
          '--no-warnings',
          '--progress',
          '--ffmpeg-location', ffmpegPath,
          '--extractor-args', 'youtube:player_client=android,web'
        ]

        if (video.index) {
          args.push('--playlist-items', String(video.index))
        }

        const process = spawn(ytDlpPath, args)

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

