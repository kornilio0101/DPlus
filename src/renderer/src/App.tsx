import { useState } from 'react'
import DownloadPanel from './components/DownloadPanel.tsx'
import './index.css'

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>DPlus</h1>
        <p>Premium Video Downloader</p>
      </header>
      <main>
        <DownloadPanel />
      </main>
      <footer>
        <p>Support for YouTube, Twitter, Facebook, Instagram</p>
        <p style={{ marginTop: '10px', color: 'gray', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Made with ❤️ by &nbsp; <a href="https://github.com/Kornilio0101" target="_blank"> Kornilio</a></p>
      </footer>
    </div>
  )
}

export default App
