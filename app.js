// ============================================================
//  TUNEFLOW — app.js
//  Music Player Logic
//  -----------------------------------------------------------
//  HOW TO ADD YOUR OWN SONGS:
//  1. Drop your .mp3 files into the assets/songs/ folder
//  2. Drop your cover images into assets/covers/
//  3. Update the `playlists` array below with your song info
// ============================================================

// ── DEMO DATA ─────────────────────────────────────────────
//  Since we can't host real audio files in the demo,
//  we use FREE public domain sample URLs from the web.
//  Replace `src` with your own file paths like:
//  src: 'assets/songs/my-song.mp3'

const playlists = [
  {
    name: "🔥 Hot Right Now",
    gradient: "linear-gradient(135deg, #1a1a2e, #c8f542)",
    songs: [
      {
        title: "Summer Breeze",
        artist: "The Groove Collective",
        duration: "3:24",
        emoji: "🌊",
        color: "#c8f542",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      },
      {
        title: "Midnight Drive",
        artist: "Luna Echo",
        duration: "4:12",
        emoji: "🌙",
        color: "#7c3aed",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      },
      {
        title: "Electric Soul",
        artist: "Nova Signal",
        duration: "3:45",
        emoji: "⚡",
        color: "#f59e0b",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      },
      {
        title: "Golden Hour",
        artist: "Sunrise Band",
        duration: "5:01",
        emoji: "☀️",
        color: "#f97316",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      },
    ],
  },
  {
    name: "🌙 Late Night Vibes",
    gradient: "linear-gradient(135deg, #0d1b2a, #7c3aed)",
    songs: [
      {
        title: "Deep Blue",
        artist: "Ocean Tides",
        duration: "4:30",
        emoji: "🌊",
        color: "#0ea5e9",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      },
      {
        title: "City Lights",
        artist: "Neon Drift",
        duration: "3:55",
        emoji: "🏙️",
        color: "#ec4899",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      },
      {
        title: "Slow Motion",
        artist: "The Dreamers",
        duration: "5:10",
        emoji: "💤",
        color: "#8b5cf6",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      },
    ],
  },
  {
    name: "⚡ Energy Boost",
    gradient: "linear-gradient(135deg, #1a0533, #f59e0b)",
    songs: [
      {
        title: "Power Up",
        artist: "Beat Force",
        duration: "2:58",
        emoji: "💪",
        color: "#f59e0b",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      },
      {
        title: "Run It",
        artist: "Chase Mode",
        duration: "3:22",
        emoji: "🏃",
        color: "#ef4444",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
      },
    ],
  },
  {
    name: "🌊 Chill Wave",
    gradient: "linear-gradient(135deg, #0a0a1a, #0ea5e9)",
    songs: [
      {
        title: "Floating",
        artist: "Drift Theory",
        duration: "6:00",
        emoji: "☁️",
        color: "#0ea5e9",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
      },
      {
        title: "Ocean Floor",
        artist: "Serene Waves",
        duration: "4:45",
        emoji: "🐚",
        color: "#14b8a6",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
      },
    ],
  },
];

// ── STATE ─────────────────────────────────────────────────
let currentPlaylist = 0;
let currentSongIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let likedSongs = new Set();
let likedPlayer = false;

const audio = document.getElementById("audioPlayer");

// ── INIT ──────────────────────────────────────────────────
function init() {
  renderPlaylistCards();
  loadPlaylist(0);
  setupSearch();
  audio.volume = 0.8;
}

// ── RENDER SONGS ──────────────────────────────────────────
function renderSongs(songs) {
  const list = document.getElementById("songList");
  if (!songs.length) {
    list.innerHTML = '<div class="empty-state">No songs found</div>';
    return;
  }

  list.innerHTML = songs
    .map((song, i) => {
      const isCurrentPlaying = i === currentSongIndex && isPlaying;
      return `
      <div class="song-item ${i === currentSongIndex ? "playing" : ""}" onclick="playSong(${i})">
        <div class="song-num">
          <span class="song-num-text">${isCurrentPlaying ? waveBars() : i + 1}</span>
          <span class="song-num-play"><i class="fas fa-play"></i></span>
        </div>
        <div class="song-cover">${song.emoji || "🎵"}</div>
        <div class="song-info">
          <div class="song-title">${song.title}</div>
          <div class="song-artist">${song.artist}</div>
        </div>
        <span class="song-duration">${song.duration}</span>
        <button class="song-like ${likedSongs.has(i) ? "liked" : ""}" onclick="event.stopPropagation(); toggleSongLike(${i})">
          <i class="${likedSongs.has(i) ? "fas" : "far"} fa-heart"></i>
        </button>
      </div>`;
    })
    .join("");
}

function waveBars() {
  return `<div class="wave-bars"><span></span><span></span><span></span><span></span></div>`;
}

// ── RENDER PLAYLIST CARDS ─────────────────────────────────
function renderPlaylistCards() {
  const container = document.getElementById("playlistCards");
  const bgColors = ["#1a2e1a", "#1a1a2e", "#2e1a1a", "#1a2a2e"];
  container.innerHTML = playlists
    .map(
      (pl, i) => `
      <div class="playlist-card" onclick="loadPlaylist(${i}); playAll()">
        <div class="playlist-card-art" style="background:${bgColors[i] || bgColors[0]}">${pl.name.split(" ")[0]}</div>
        <div class="playlist-card-name">${pl.name.replace(/^\S+\s/, "")}</div>
        <div class="playlist-card-count">${pl.songs.length} songs</div>
      </div>`
    )
    .join("");
}

// ── LOAD PLAYLIST ─────────────────────────────────────────
function loadPlaylist(index) {
  currentPlaylist = index;
  currentSongIndex = -1;
  likedSongs.clear();

  const pl = playlists[index];

  // Update sidebar active
  document.querySelectorAll(".playlist-item").forEach((el, i) => {
    el.classList.toggle("active", i === index);
  });

  // Update banner
  document.getElementById("bannerTitle").textContent = pl.name.replace(/^\S+\s/, "");
  document.getElementById("bannerSub").textContent = `${pl.songs.length} songs • Mixed Artists`;
  document.getElementById("banner").style.background = pl.gradient;

  renderSongs(pl.songs);
}

// ── PLAY A SONG ───────────────────────────────────────────
function playSong(index) {
  const pl = playlists[currentPlaylist];
  const song = pl.songs[index];
  if (!song) return;

  currentSongIndex = index;
  audio.src = song.src;
  audio.play().catch(() => {
    // Browser may block autoplay — user must interact first
    console.warn("Autoplay blocked by browser. Click play.");
  });
  isPlaying = true;

  updatePlayerUI(song);
  renderSongs(pl.songs); // re-render to update playing state
  document.getElementById("vinylDisc").classList.add("spinning");
}

// ── UPDATE PLAYER UI ──────────────────────────────────────
function updatePlayerUI(song) {
  document.getElementById("playerTitle").textContent = song.title;
  document.getElementById("playerArtist").textContent = song.artist;
  document.getElementById("playerCover").innerHTML = `<span style="font-size:1.8rem">${song.emoji || "🎵"}</span>`;
  document.getElementById("playBtn").innerHTML = `<i class="fas fa-pause"></i>`;

  // Liked state
  const liked = likedSongs.has(currentSongIndex);
  const heartBtn = document.getElementById("heartBtn");
  heartBtn.classList.toggle("liked", liked);
  heartBtn.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
}

// ── PLAY / PAUSE ──────────────────────────────────────────
function togglePlay() {
  if (currentSongIndex === -1) {
    playSong(0);
    return;
  }
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    document.getElementById("playBtn").innerHTML = `<i class="fas fa-play"></i>`;
    document.getElementById("vinylDisc").classList.remove("spinning");
  } else {
    audio.play();
    isPlaying = true;
    document.getElementById("playBtn").innerHTML = `<i class="fas fa-pause"></i>`;
    document.getElementById("vinylDisc").classList.add("spinning");
  }
}

// ── PLAY ALL ──────────────────────────────────────────────
function playAll() {
  playSong(0);
}

// ── NEXT / PREV ───────────────────────────────────────────
function nextSong() {
  const pl = playlists[currentPlaylist];
  let next;
  if (isShuffle) {
    next = Math.floor(Math.random() * pl.songs.length);
  } else {
    next = (currentSongIndex + 1) % pl.songs.length;
  }
  playSong(next);
}

function prevSong() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const pl = playlists[currentPlaylist];
  const prev = (currentSongIndex - 1 + pl.songs.length) % pl.songs.length;
  playSong(prev);
}

// ── SHUFFLE / REPEAT ──────────────────────────────────────
function toggleShuffle() {
  isShuffle = !isShuffle;
  document.getElementById("shuffleBtn").classList.toggle("active", isShuffle);
}

function toggleRepeat() {
  isRepeat = !isRepeat;
  document.getElementById("repeatBtn").classList.toggle("active", isRepeat);
  audio.loop = isRepeat;
}

// ── LIKE / HEART ──────────────────────────────────────────
function toggleLike() {
  if (currentSongIndex === -1) return;
  const heartBtn = document.getElementById("heartBtn");
  if (likedSongs.has(currentSongIndex)) {
    likedSongs.delete(currentSongIndex);
    heartBtn.classList.remove("liked");
    heartBtn.innerHTML = `<i class="far fa-heart"></i>`;
  } else {
    likedSongs.add(currentSongIndex);
    heartBtn.classList.add("liked");
    heartBtn.innerHTML = `<i class="fas fa-heart"></i>`;
  }
  renderSongs(playlists[currentPlaylist].songs);
}

function toggleSongLike(index) {
  if (likedSongs.has(index)) {
    likedSongs.delete(index);
  } else {
    likedSongs.add(index);
  }
  renderSongs(playlists[currentPlaylist].songs);
  if (index === currentSongIndex) {
    const liked = likedSongs.has(index);
    const heartBtn = document.getElementById("heartBtn");
    heartBtn.classList.toggle("liked", liked);
    heartBtn.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
  }
}

// ── PROGRESS BAR ──────────────────────────────────────────
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressThumb").style.left = pct + "%";
  document.getElementById("currentTime").textContent = formatTime(audio.currentTime);
  document.getElementById("totalTime").textContent = formatTime(audio.duration);
});

audio.addEventListener("ended", () => {
  if (!isRepeat) nextSong();
});

function seek(e) {
  const bar = document.getElementById("progressBar");
  const rect = bar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, x / rect.width));
  audio.currentTime = pct * audio.duration;
}

function formatTime(secs) {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── VOLUME ────────────────────────────────────────────────
function setVolume(e) {
  const bar = document.getElementById("volumeBar");
  const rect = bar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const vol = Math.max(0, Math.min(1, x / rect.width));
  audio.volume = vol;
  document.getElementById("volumeFill").style.width = vol * 100 + "%";
}

// ── SEARCH ────────────────────────────────────────────────
function setupSearch() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const pl = playlists[currentPlaylist];
    if (!q) {
      renderSongs(pl.songs);
      return;
    }
    const filtered = pl.songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
    );
    renderSongs(filtered);
  });
}

// ── SIDEBAR PLAYLIST CLICK ────────────────────────────────
document.querySelectorAll(".playlist-item").forEach((el) => {
  el.addEventListener("click", () => {
    loadPlaylist(parseInt(el.dataset.playlist));
  });
});

// ── START ─────────────────────────────────────────────────
init();
