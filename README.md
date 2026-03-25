# 🚀 DPlus - Video Downloader

DPlus is a high-performance video downloader for Windows. It provides a seamless experience for downloading videos from major platforms including **YouTube**, **Twitter (X)**, **Facebook**, and **Instagram**, with a heavy focus on quality and reliability.

![DPlus Preview](./preview_.jpg)

---

## ✨ Features

- 🌍 **Multi-Platform Support**: Seamlessly download content from YouTube, Twitter (X), Facebook, and Instagram.
- 🎯 **Real-time Quality Selection**: Choose from exact available formats, including resolution, framerate (60fps), and codec (`av01`, `avc1`).
- 📁 **Strict MP4 Enforcement**: Intelligent filtering and FFmpeg merging ensures every download is delivered in a high-quality **.mp4** container.
- ⚡ **Stream Merging Fixed**: Integrated FFmpeg to ensure the highest quality video and audio are merged into a single, perfect file.
- 📸 **Smart Batch Selection**: A dedicated selection screen for posts with multiple videos, featuring a 16:9 grid with 3 items per row and auto-skip for single videos.
- 📝 **Customizable Naming**: A dedicated naming screen for individual or batch downloads, complete with thumbnail previews and Windows-safe filename sanitization.
- 📊 **Dynamic Progress Engine**: Precise progress tracking with a dynamic visual progress bar for both individual and batch jobs.
- 🚀 **Zero-Install Portable**: Single `.exe` binary that runs anywhere—no installation or admin rights required.

---

## 🚀 Getting Started

### For Users
The latest **Portable Windows version (v1.2.5)** is available in the [GitHub Releases](https://github.com/Kornilio/DPlus/releases) section.

1. 📥 **Download** `DPlus_Portable_1.2.5.exe`.
2. ⏯️ **Run** the application.
3. 🔗 **Paste** your video link and hit **Download**.
4. ✅ **Select Videos**: Choose which clips to keep (skipped if only one).
5. 🏷️ **Name & Quality**: Choose the exact resolution/format for each video and customize filenames.
6. 🚀 **Download**: Hit "Start Download" and the app will handle the rest.

### For Developers
If you wish to build DPlus from source:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kornilio0101/DPlus.git
   cd DPlus/dplus
   ```
2. **Install dependencies**: `npm install`
3. **Run in development mode**: `npm run dev`
4. **Build for production**: `npm run package`

---

## 🛠️ Tech Stack

- ⚛️ **Framework**: [Electron](https://www.electronjs.org/) + [React](https://reactjs.org/)
- ⚡ **Build Tool**: [Vite](https://vitejs.dev/)
- ⚙️ **Engine**: [yt-dlp](https://github.com/yt-dlp/yt-dlp) & [FFmpeg](https://ffmpeg.org/)
- 🛡️ **Language**: [TypeScript](https://www.typescriptlang.org/)

---

## 📝 Usage Flow

1. **Paste Link**: Insert your video URL into the primary input field.
2. **Select Videos**: If multiple videos are found, a grid appears. Select your choices.
3. **Customize Naming**: Confirm or edit filenames and qualities on the naming screen.
4. **Download**: Watch the real-time progress as your video is saved and the destination folder is opened automatically.
5. **Navigation**: Use the "Back" button at any time to return to a previous step.

---

Made by [Kornilio](https://github.com/Kornilio0101)
