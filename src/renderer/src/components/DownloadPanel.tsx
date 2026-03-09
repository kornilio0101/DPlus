import React, { useState, useEffect, useRef } from 'react'
import './DownloadPanel.css'

const DownloadPanel: React.FC = () => {
  const [url, setUrl] = useState('')
  const [filename, setFilename] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const filenameInputRef = useRef<HTMLInputElement>(null)

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
    if (showModal && filenameInputRef.current) {
      filenameInputRef.current.focus()
    }
  }, [showModal])

  const handleDownloadClick = async () => {
    if (!url) return
    setShowModal(true)
    setFilename('Fetching title...')
    try {
      const result = await (window as any).ipcRenderer.invoke('get-video-title', url)
      if (result.success) {
        setFilename(result.title)
      } else {
        setFilename('')
      }
    } catch (err) {
      console.error(err)
      setFilename('')
    }
  }

  const confirmDownload = async () => {
    setShowModal(false)
    setStatus('loading')
    setProgress(0)
    setErrorMessage('')
    
    // Use original title if filename is empty or still fetching
    const finalFilename = (filename === 'Fetching title...') ? '' : filename
    
    try {
      const result = await (window as any).ipcRenderer.invoke('download-video', { url, filename: finalFilename })
      if (result.success) {
        setStatus('success')
        setUrl('')
        setFilename('')
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
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {status === 'success' && <p className="status-msg success">Download Complete!</p>}
      {status === 'error' && <p className="status-msg error">{errorMessage}</p>}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Save File As</h3>
            <p>Enter a preferred name for your video (optional)</p>
            <input 
              ref={filenameInputRef}
              type="text" 
              placeholder="e.g. My Favorite Video" 
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmDownload()}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmDownload}>Start Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadPanel
