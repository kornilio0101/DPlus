const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testDownload(video) {
  const ytDlpPath = path.resolve('node_modules/yt-dlp-exec/bin/yt-dlp.exe');
  const downloadsPath = path.resolve('test_downloads');
  if (!fs.existsSync(downloadsPath)) fs.mkdirSync(downloadsPath);

  const outputTemplate = path.join(downloadsPath, `${video.title}.%(ext)s`);
  const filter = 'bestvideo+bestaudio/best';

  const args = [
    video.url,
    '-f', filter,
    '-o', outputTemplate,
    '--no-check-certificate',
    '--no-warnings',
    '--progress'
  ];

  if (video.index) {
    args.push('--playlist-items', String(video.index));
  }

  console.log('Running:', ytDlpPath, args.join(' '));

  return new Promise((resolve) => {
    const child = spawn(ytDlpPath, args);
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => errorOutput += data.toString());

    child.on('close', (code) => {
      console.log('Code:', code);
      console.log('Output:', output.slice(-500));
      console.log('Error:', errorOutput);
      resolve(code === 0);
    });
  });
}

// Test data from the problematic URL
const videoData = {
  id: "2036653084655448064",
  title: "Mario Nawfal - 🚨🇰🇼 Kuwait issued nuclear safety guidance to citizens:  \"Seal windows... #1",
  url: "https://video.twimg.com/ext_tw_video/2036653084655448064/pu/vid/avc1/1280x720/NU6LrUSXLLLf5FjT.mp4?tag=19",
  index: 1
};

testDownload(videoData);
