import React, { useState, useEffect, useRef } from 'react'
import './DownloadPanel.css'

const DownloadPanel: React.FC = () => {
  const [url, setUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const filenameInputRef = useRef<HTMLInputElement>(null)

  const [isPlaylist, setIsPlaylist] = useState(false)
  const [playlistEntries, setPlaylistEntries] = useState<{ id: string; title: string; url: string }[]>([])
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
  const [qualityPreference, setQualityPreference] = useState('1080')

  const [formats, setFormats] = useState<{ id: string; label: string; ext: string }[]>([])
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [modalStep, setModalStep] = useState<'quality' | 'filename' | 'playlist'>('quality')
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (status === 'loading') {
      const removeListener = (window as any).ipcRenderer.on('download-progress', (p: number) => {
        setProgress(Math.floor(p))
      })
      return () => removeListener()
    }
  }, [status])

  useEffect(() => {
    if (showModal && modalStep === 'filename' && filenameInputRef.current) {
      filenameInputRef.current.focus()
    }
  }, [showModal, modalStep])

  const handleDownloadClick = async () => {
    if (!url) return
    setShowModal(true)
    setIsFetchingMetadata(true)
    setFormats([])
    setPlaylistEntries([])
    setIsPlaylist(false)
    
    try {
      const result = await (window as any).ipcRenderer.invoke('get-video-metadata', url)
      if (result.success) {
        if (result.isPlaylist) {
          setIsPlaylist(true)
          setPlaylistEntries(result.entries)
          setSelectedVideoIds(new Set(result.entries.map((e: any) => e.id))) // Select all by default
          setModalStep('playlist')
        } else {
          setIsPlaylist(false)
          setFormats(result.formats)
          setFilename(result.title)
          setModalStep('quality')
        }
      } else {
        setErrorMessage(result.message || 'Could not fetch info.')
        setShowModal(false)
      }
    } catch (err) {
      console.error(err)
      setShowModal(false)
    } finally {
      setIsFetchingMetadata(false)
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

  const selectQuality = (id: string) => {
    setSelectedFormat(id)
    setModalStep('filename')
  }

  const startBatchDownload = async () => {
    setShowModal(false)
    setStatus('loading')
    setProgress(0)
    setErrorMessage('')

    const selectedVideos = playlistEntries.filter(e => selectedVideoIds.has(e.id))

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

  const confirmDownload = async () => {
    setShowModal(false)
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
        setErrorMessage(result.message || 'Something went wrong. Please check the link.')
      }
    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            {isFetchingMetadata ? (
              <div className="loader-container">
                <div className="spinner"></div>
                <p>Fetching info...</p>
              </div>
            ) : modalStep === 'playlist' ? (
              <div className="playlist-selection">
                <h3>Select Videos from Playlist</h3>
                <div className="playlist-controls">
                   <div className="quality-pref">
                     <label>Quality Preference:</label>
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
                <div className="video-list">
                  {playlistEntries.map((video) => (
                    <div key={video.id} className={`video-item ${selectedVideoIds.has(video.id) ? 'selected' : ''}`} onClick={() => toggleVideoSelection(video.id)}>
                      <input type="checkbox" checked={selectedVideoIds.has(video.id)} readOnly />
                      <span>{video.title}</span>
                    </div>
                  ))}
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="confirm-btn" onClick={startBatchDownload} disabled={selectedVideoIds.size === 0}>
                    Download {selectedVideoIds.size} Videos
                  </button>
                </div>
              </div>
            ) : modalStep === 'quality' ? (
              <div className="quality-selection">
                <h3>Select Quality</h3>
                <div className="format-list">
                  {formats.length > 0 ? (
                    formats.map((f) => (
                      <button 
                        key={f.id} 
                        className="format-item" 
                        onClick={() => selectQuality(f.id)}
                      >
                        <span className="res">{f.label}</span>
                        <span className="ext">{f.ext}</span>
                      </button>
                    ))
                  ) : (
                    <div className="no-formats">
                      <p>No specific formats found. Use best quality?</p>
                      <button className="confirm-btn" onClick={() => selectQuality('')}>Best Quality</button>
                    </div>
                  )}
                </div>
                <button className="cancel-btn full" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            ) : (
              <div className="filename-step">
                <h3>Save File As</h3>
                <p>Enter a preferred name for your video</p>
                <input 
                  ref={filenameInputRef}
                  type="text" 
                  placeholder="e.g. My Favorite Video" 
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmDownload()}
                />
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setModalStep('quality')}>Back</button>
                  <button className="confirm-btn" onClick={confirmDownload}>Start Download</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadPanel
