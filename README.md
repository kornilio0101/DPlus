# DPlus Video Downloader

DPlus is a video downloader for Windows. It supports downloading from YouTube, Twitter (X), Facebook, and Instagram.

---

## ✨ Features

- **Multi-Platform Support**: Download from YouTube, Twitter (X), Facebook, and Instagram.
- **Quality Selection**: Choose resolution, framerate, and codec before downloading.
- **MP4 Output**: Files are saved as .mp4.
- **Deduplication**: Automatically skips duplicate video entries in a single post.
- **Merging**: FFmpeg combines video and audio streams for high-resolution downloads.
- **Batch selection**: Grid for selecting multiple videos from one link (auto-skipped if only 1 video).
- **Custom Naming**: Thumbnail previews and filename sanitization for Windows.
- **Progress Tracking**: Real-time progress bar for all downloads.
- **Portable**: Single .exe file for Windows.

---

## 🚀 Getting Started

### For Users
The latest **Portable Windows version (v1.2.5)** is available in the [GitHub Releases](https://github.com/Kornilio/DPlus/releases) section.

1. Download `DPlus_Portable_1.2.5.exe`.
2. Run the application.
3. Paste a link and click **Download**.
4. **Select Videos**: Choose which clips to download (skipped if only one).
5. **Name & Quality**: Select quality and rename files.
6. **Download**: Click "Start Download".

### For Developers
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kornilio0101/DPlus.git
   cd DPlus/dplus
   ```

2. **Install dependencies**: `npm install`
3. **Run dev mode**: `npm run dev`
4. **Build package**: `npm run package`

---

## 🛠️ Tech Stack

- **Core**: Electron
- **Frontend**: React + Vite
- **Engine**: yt-dlp & FFmpeg
- **Language**: TypeScript

---

## 📝 Usage Flow

1. **Paste Link**: Enter the URL.
2. **Select Videos**: Choose videos from the grid (if multiple).
3. **Customize**: Pick names and quality.
4. **Download**: App saves the file and opens the folder.

---

Made by [Kornilio](https://github.com/Kornilio0101)
