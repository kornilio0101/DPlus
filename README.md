# DPlus - Premium Video Downloader

DPlus is a high-performance, professional video downloader for Windows. It provides a seamless experience for downloading videos from major platforms including **YouTube**, **Twitter (X)**, **Facebook**, and **Instagram**, with a heavy focus on user experience and visual excellence.

![DPlus Preview](./preview_.jpg)

---

## ✨ Features

- **Multi-Platform Excellence**: Seamlessly download content from YouTube, Twitter (X), Facebook, and Instagram.
- **Intelligent Metadata Handling**: Automatically fetches the original video title for smart filename suggestions.
- **Dynamic Quality Selection**: Fetch available video qualities and choose the perfect balance between file size and resolution.
- **Real-time Progress Engine**: Precise 1% increment progress tracking with a dynamic visual progress bar.
- **Premium Glassmorphic UI**: Modern design language featuring smooth micro-animations, blur effects, and a responsive layout.
- **Zero-Install Portable**: Single `.exe` binary that runs anywhere—no installation or admin rights required.
- **Auto-Organization**: Automatically creates a `DPlus` folder in your standard Downloads directory and opens it upon completion.

---

## 🚀 Getting Started

### For Users
The latest **Portable Windows version** is available in the [GitHub Releases](https://github.com/Kornilio/DPlus/releases) section.

1. Download `DPlus_Portable_x.x.x.exe`.
2. Run the application.
3. Paste your video link and hit **Download**.
4. Select your preferred **Quality** and **Filename**.

### For Developers
If you wish to build DPlus from source:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kornilio/DPlus.git
   cd DPlus/dplus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run package
   ```

---

## 🛠️ Tech Stack & Architecture

- **Core Framework**: [Electron](https://www.electronjs.org/) (Cross-platform desktop integration)
- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) (High-performance UI rendering)
- **Engine**: [yt-dlp](https://github.com/yt-dlp/yt-dlp) (Bundled and optimized for maximum compatibility)
- **Styling**: Vanilla CSS with **Glassmorphism** principles
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Type-safe codebase)

---

## 📝 Usage

1. **Paste Link**: Insert your video URL into the primary input field.
2. **Fetch Metadata**: Click **Download** to start the metadata retrieval process.
3. **Select Quality**: Choose from the list of available resolutions fetched directly from the source.
4. **Customize Filename**: Confirm or edit the suggested filename in the auto-focused modal.
5. **Download**: Watch the real-time progress as your video is saved and the destination folder is opened automatically.

---

Made with ❤️ by [Kornilio](https://github.com/Kornilio0101)
