import React, { useState, useEffect, useRef } from 'react'
import './DownloadPanel.css'

type Screen = 'url' | 'fetching' | 'select' | 'naming'

interface VideoEntry {
  id: string
  title: string
  url: string
  thumbnail?: string
  index?: number
}

const DownloadPanel: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('url')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  // Metadata
  const [isPlaylist, setIsPlaylist] = useState(false)
  const [playlistEntries, setPlaylistEntries] = useState<VideoEntry[]>([])
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
  const [qualityPreference, setQualityPreference] = useState('1080')

  // Single video
  const [formats, setFormats] = useState<{ id: string; label: string; ext: string }[]>([])
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [filename, setFilename] = useState('')

  // Batch naming
  const [videoNames, setVideoNames] = useState<Record<string, string>>({})

  const filenameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'loading') {
      const removeListener = (window as any).ipcRenderer.on('download-progress', (p: number) => {
        setProgress(Math.floor(p))
      })
      return () => removeListener()
    }
  }, [status])

  useEffect(() => {
    if (screen === 'naming' && filenameInputRef.current) {
      filenameInputRef.current.focus()
    }
  }, [screen])

  const handleDownloadClick = async () => {
    if (!url) return
    setScreen('fetching')
    setFormats([])
    setPlaylistEntries([])
    setIsPlaylist(false)
    setErrorMessage('')

    try {
      const result = await (window as any).ipcRenderer.invoke('get-video-metadata', url)
      if (result.success) {
        if (result.isPlaylist && result.entries && result.entries.length > 1) {
          // Multiple videos — show selection screen
          setIsPlaylist(true)
          setPlaylistEntries(result.entries)
          setSelectedVideoIds(new Set(result.entries.map((e: any) => e.id)))
          setScreen('select')
        } else if (result.isPlaylist && result.entries && result.entries.length === 1) {
          // Single video detected as playlist — skip selection, go to naming
          setIsPlaylist(true)
          const entry = result.entries[0]
          setPlaylistEntries([entry])
          setSelectedVideoIds(new Set([entry.id]))
          setVideoNames({ [entry.id]: entry.title })
          setScreen('naming')
        } else {
          // Single video
          setIsPlaylist(false)
          setFormats(result.formats)
          setFilename(result.title)
          setScreen('naming')
        }
      } else {
        setErrorMessage(result.message || 'Could not fetch info.')
        setScreen('url')
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('Failed to fetch video info.')
      setScreen('url')
    }
  }

  const toggleVideoSelection = (id: string) => {
    const newSelection = new Set(selectedVideoIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedVideoIds(newSelection)
  }

  const goToNaming = () => {
    // Initialize names from selected videos
    const names: Record<string, string> = {}
    playlistEntries
      .filter(e => selectedVideoIds.has(e.id))
      .forEach(e => { names[e.id] = e.title })
    setVideoNames(names)
    setScreen('naming')
  }

  const startBatchDownload = async () => {
    setScreen('url')
    setStatus('loading')
    setProgress(0)
    setErrorMessage('')

    const selectedVideos = playlistEntries
      .filter(e => selectedVideoIds.has(e.id))
      .map(e => ({
        ...e,
        title: videoNames[e.id] || e.title
      }))

    try {
      const result = await (window as any).ipcRenderer.invoke('download-batch', {
        videos: selectedVideos,
        qualityPreference
      })
      if (result.success) {
        setStatus('success')
        setUrl('')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMessage(result.message || 'Batch download failed.')
      }
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

  const confirmSingleDownload = async () => {
    setScreen('url')
    setStatus('loading')
    setProgress(0)
    setErrorMessage('')

    const finalFilename = (filename === 'Fetching title...') ? '' : filename

    try {
      const result = await (window as any).ipcRenderer.invoke('download-video', {
        url,
        filename: finalFilename,
        format: selectedFormat
      })
      if (result.success) {
        setStatus('success')
        setUrl('')
        setFilename('')
        setSelectedFormat('')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setErrorMessage(result.message || 'Something went wrong.')
      }
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

  const goBack = () => {
    if (screen === 'naming') {
      if (isPlaylist && playlistEntries.length > 1) {
        setScreen('select')
      } else {
        setScreen('url')
      }
    } else if (screen === 'select') {
      setScreen('url')
    }
  }

  // ==================== RENDER ====================

  // Screen 1: URL Input
  if (screen === 'url') {
    return (
      <div className="download-panel">
        <div className="input-group">
          <input
            type="text"
            placeholder="Paste video or playlist link here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === 'loading'}
          />
          <button
            onClick={handleDownloadClick}
            disabled={status === 'loading' || !url}
          >
            {status === 'loading' ? 'Downloading...' : 'Download'}
          </button>
        </div>

        {status === 'loading' && (
          <div className="progress-container">
            <div className="progress-bar-wrapper">
              <div className="progress-bar" style={{ width: `${progress}%` }}>
                <span className="progress-percentage-inner">{progress}%</span>
              </div>
            </div>
            <span className="progress-status-text">
              {isPlaylist ? `Batch Progress... ${progress}%` : `Downloading... ${progress}%`}
            </span>
          </div>
        )}

        {status === 'success' && <p className="status-msg success">Download Complete!</p>}
        {status === 'error' && <p className="status-msg error">{errorMessage}</p>}
      </div>
    )
  }

  // Screen: Fetching
  if (screen === 'fetching') {
    return (
      <div className="download-panel screen-panel">
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Fetching video info...</p>
        </div>
      </div>
    )
  }

  // Screen 2: Video Selection (only for multiple videos)
  if (screen === 'select') {
    return (
      <div className="download-panel screen-panel">
        <h3 className="screen-title">Select Videos to Download</h3>

        <div className="playlist-controls">
          <div className="quality-pref">
            <label>Quality:</label>
            <select value={qualityPreference} onChange={(e) => setQualityPreference(e.target.value)}>
              <option value="2160">4K (2160p)</option>
              <option value="1440">2K (1440p)</option>
              <option value="1080">Full HD (1080p)</option>
              <option value="720">HD (720p)</option>
              <option value="480">480p</option>
              <option value="360">360p</option>
            </select>
          </div>
          <div className="selection-actions">
            <button onClick={() => setSelectedVideoIds(new Set(playlistEntries.map(e => e.id)))}>Select All</button>
            <button onClick={() => setSelectedVideoIds(new Set())}>Deselect All</button>
          </div>
        </div>

        <div className="video-grid">
          {playlistEntries.map((video) => (
            <div
              key={video.id}
              className={`video-card ${selectedVideoIds.has(video.id) ? 'selected' : ''}`}
              onClick={() => toggleVideoSelection(video.id)}
            >
              <div className="video-card-thumb">
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.title} />
                ) : (
                  <div className="thumb-placeholder">No Preview</div>
                )}
                <div className="check-badge">
                  <input type="checkbox" checked={selectedVideoIds.has(video.id)} readOnly />
                </div>
              </div>
              <div className="video-card-title" title={video.title}>{video.title}</div>
            </div>
          ))}
        </div>

        <div className="screen-footer">
          <button className="back-btn" onClick={goBack}>← Back</button>
          <button
            className="confirm-btn"
            onClick={goToNaming}
            disabled={selectedVideoIds.size === 0}
          >
            Next → Name {selectedVideoIds.size} Video{selectedVideoIds.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  // Screen 3: Naming
  if (screen === 'naming') {
    const isSingle = !isPlaylist
    const selectedEntries = playlistEntries.filter(e => selectedVideoIds.has(e.id))

    return (
      <div className="download-panel screen-panel">
        <h3 className="screen-title">{isSingle ? 'Save File As' : `Name ${selectedEntries.length} Video${selectedEntries.length > 1 ? 's' : ''}`}</h3>

        {isSingle ? (
          <div className="naming-single">
            <p className="naming-hint">Enter a preferred name for your video</p>
            <input
              ref={filenameInputRef}
              type="text"
              placeholder="e.g. My Favorite Video"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmSingleDownload()}
            />
          </div>
        ) : (
          <div className="naming-batch">
            {selectedEntries.map((video) => (
              <div key={video.id} className="naming-row">
                <div className="naming-thumb">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} />
                  ) : (
                    <div className="thumb-placeholder small">🎬</div>
                  )}
                </div>
                <input
                  type="text"
                  value={videoNames[video.id] || ''}
                  onChange={(e) => setVideoNames(prev => ({ ...prev, [video.id]: e.target.value }))}
                  placeholder="Video name..."
                />
              </div>
            ))}
          </div>
        )}

        <div className="screen-footer">
          <button className="back-btn" onClick={goBack}>← Back</button>
          <button
            className="confirm-btn"
            onClick={isSingle ? confirmSingleDownload : startBatchDownload}
          >
            🚀 Start Download
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default DownloadPanel
