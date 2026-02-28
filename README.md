# ◈ TuneFlow

A Spotify-inspired music streaming web app built with pure HTML, CSS, and JavaScript.

![TuneFlow Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

🎵 **[Live Demo →](https://YOUR-USERNAME.github.io/tuneflow)**

---

## ✨ Features

- 🎵 **Music Player** — Play, pause, skip songs with a full-featured control bar
- 📋 **Multiple Playlists** — Switch between curated playlists
- 🔀 **Shuffle & Repeat** — Full playback control
- ❤️ **Like Songs** — Heart your favourite tracks
- 🔍 **Search** — Filter songs by title or artist
- 📊 **Progress Bar** — Seek to any point in a song
- 🔊 **Volume Control** — Adjustable volume slider
- 🎨 **Vinyl Animation** — Spinning disc synced to playback
- 📱 **Responsive** — Works on desktop and mobile

---

## 🚀 Getting Started

### Run Locally
1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/tuneflow.git
   cd tuneflow
   ```
2. Open `index.html` in your browser — that's it!

### Adding Your Own Songs
1. Drop `.mp3` files into `assets/songs/`
2. Drop cover images into `assets/covers/`
3. In `app.js`, update the `playlists` array:
   ```js
   {
     title: "My Song",
     artist: "Artist Name",
     duration: "3:30",
     emoji: "🎸",
     src: "assets/songs/my-song.mp3",
   }
   ```

---

## 🗂️ Project Structure

```
tuneflow/
├── index.html          # Main HTML structure
├── style.css           # All styling & animations
├── app.js              # Music player logic
├── assets/
│   ├── songs/          # Your .mp3 files
│   └── covers/         # Album art images
└── README.md
```

---

## 🛠️ Built With

- **HTML5 Audio API** — Native browser audio playback
- **CSS Custom Properties** — Theme & design system
- **Vanilla JavaScript** — Zero dependencies, pure JS
- **Font Awesome** — Icons
- **Google Fonts** — Syne + DM Sans typography

---

## 📸 Screenshots

> *(Add screenshots of your app here)*

---

## 🔮 Future Plans

- [ ] Backend integration (Node.js + Express)
- [ ] User authentication
- [ ] Real song upload functionality
- [ ] Database for playlists (MongoDB)
- [ ] Mobile app version

---

## 👤 Author

**Your Name**  
[GitHub](https://github.com/YOUR-USERNAME) · [LinkedIn](https://linkedin.com/in/YOUR-PROFILE)

---

## 📄 License

MIT — free to use and modify.
