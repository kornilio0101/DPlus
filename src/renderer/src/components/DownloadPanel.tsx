import React, { useState, useEffect, useRef } from 'react'
import './DownloadPanel.css'

const DownloadPanel: React.FC = () => {
  const [url, setUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const filenameInputRef = useRef<HTMLInputElement>(null)

  const [formats, setFormats] = useState<{ id: string; label: string; ext: string }[]>([])
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [modalStep, setModalStep] = useState<'quality' | 'filename'>('quality')
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
    setModalStep('quality')
    setIsFetchingMetadata(true)
    setFormats([])
    
    try {
      const result = await (window as any).ipcRenderer.invoke('get-video-metadata', url)
      if (result.success) {
        setFormats(result.formats)
        setFilename(result.title)
      } else {
        setErrorMessage(result.message || 'Could not fetch video info.')
        setShowModal(false)
      }
    } catch (err) {
      console.error(err)
      setShowModal(false)
    } finally {
      setIsFetchingMetadata(false)
    }
  }

  const selectQuality = (id: string) => {
    setSelectedFormat(id)
    setModalStep('filename')
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
          placeholder="Paste video link here..." 
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
          <span className="progress-status-text">Downloading... {progress}%</span>
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
                <p>Fetching video qualities...</p>
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
