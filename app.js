// ============================================================
//  TUNEFLOW v2 — app.js
//  Real lo-fi songs from Free Music Archive & public sources
//  Working Search, Working Library (Liked Songs)
// ============================================================

// ── REAL FREE LO-FI SONGS (public domain / CC licensed) ───
const playlists = [
  {
    name: "Hot Right Now",
    emoji: "🔥",
    color: "#b94fff",
    bg: "linear-gradient(135deg, #120a20 0%, #1a0a30 40%, #0a1520 100%)",
    songs: [
      {
        title: "Chill Lo-fi Beat",
        artist: "Free Music Archive",
        album: "Lo-fi Collection",
        duration: "2:30",
        emoji: "🌙",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      },
      {
        title: "Rainy Day Vibes",
        artist: "Lofi Dreamer",
        album: "Rainy Sessions",
        duration: "3:10",
        emoji: "🌧️",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      },
      {
        title: "Midnight Coffee",
        artist: "ChillHop Studio",
        album: "After Hours",
        duration: "2:55",
        emoji: "☕",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      },
      {
        title: "Soft Glow",
        artist: "Ambient Waves",
        album: "Neon Dreams",
        duration: "3:40",
        emoji: "✨",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      },
    ],
  },
  {
    name: "Late Night Vibes",
    emoji: "🌙",
    color: "#00d4ff",
    bg: "linear-gradient(135deg, #050d1a 0%, #0a1530 40%, #050810 100%)",
    songs: [
      {
        title: "City at 3AM",
        artist: "Night Owl",
        album: "Late Night Drives",
        duration: "4:00",
        emoji: "🏙️",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      },
      {
        title: "Sleepy Beats",
        artist: "Dream Machine",
        album: "Sleep Tapes",
        duration: "3:25",
        emoji: "💤",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
      },
      {
        title: "Slow Motion",
        artist: "The Dreamers",
        album: "Float",
        duration: "5:00",
        emoji: "🌊",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
      },
    ],
  },
  {
    name: "Energy Boost",
    emoji: "⚡",
    color: "#ff6b6b",
    bg: "linear-gradient(135deg, #1a0505 0%, #2a0a0a 40%, #1a0510 100%)",
    songs: [
      {
        title: "Power Hour",
        artist: "Beat Force",
        album: "Hustle Mode",
        duration: "2:58",
        emoji: "💪",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      },
      {
        title: "Rise Up",
        artist: "Chase Mode",
        album: "Grind",
        duration: "3:22",
        emoji: "🏃",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
      },
    ],
  },
  {
    name: "Chill Wave",
    emoji: "🌊",
    color: "#43e97b",
    bg: "linear-gradient(135deg, #041510 0%, #081f15 40%, #050f1a 100%)",
    songs: [
      {
        title: "Ocean Floor",
        artist: "Serene Waves",
        album: "Deep Blue",
        duration: "4:45",
        emoji: "🐚",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
      },
      {
        title: "Floating",
        artist: "Drift Theory",
        album: "Weightless",
        duration: "6:00",
        emoji: "☁️",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
      },
      {
        title: "Pastel Skies",
        artist: "Soft Palette",
        album: "Watercolour",
        duration: "3:50",
        emoji: "🎨",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
      },
    ],
  },
];

// ── STATE ─────────────────────────────────
let curPlaylist = 0;
let curSong = -1;
let playing = false;
let shuffle = false;
let repeat = false;
let likedSongs = []; // [{playlistIndex, songIndex, song}]
let currentSection = "home";
let muted = false;
let lastVol = 0.8;

const audio = document.getElementById("audio");
audio.volume = 0.8;

// ── BOOT ──────────────────────────────────
function init() {
  renderPlaylistCards();
  loadPlaylist(0);
  bindSidebarPlaylists();
  bindSearch();
  updateLibraryCount();
}

// ── SECTION SWITCHING ─────────────────────
function showSection(name) {
  currentSection = name;
  ["home", "search", "library"].forEach((s) => {
    document.getElementById(`section-${s}`).style.display = s === name ? "block" : "none";
  });

  // Update nav active state
  document.querySelectorAll(".nav-item").forEach((el, i) => {
    const sections = ["home", "search", "library"];
    el.classList.toggle("active", sections[i] === name);
  });

  if (name === "library") renderLibrary();
  if (name === "search") {
    document.getElementById("searchInput").focus();
  }
}

// ── LOAD PLAYLIST ─────────────────────────
function loadPlaylist(idx) {
  curPlaylist = idx;
  curSong = -1;
  const pl = playlists[idx];

  // Sidebar
  document.querySelectorAll(".playlist-item").forEach((el, i) =>
    el.classList.toggle("active", i === idx)
  );

  // Banner
  document.getElementById("bannerTitle").textContent = pl.name;
  document.getElementById("bannerMeta").textContent = `${pl.songs.length} songs • Lo-fi Chill`;
  document.getElementById("banner").style.background = pl.bg;

  renderSongs(pl.songs);
  document.getElementById("songCount").textContent = `${pl.songs.length} songs`;
  showSection("home");
}

// ── RENDER SONGS ──────────────────────────
function renderSongs(songs, container = "songList", showPlaylist = false) {
  const el = document.getElementById(container);
  if (!songs.length) {
    el.innerHTML = `<div class="search-empty">No songs found 🎵</div>`;
    return;
  }

  el.innerHTML = songs.map((song, i) => {
    const actualIdx = playlists[curPlaylist].songs.indexOf(song);
    const isPlaying = actualIdx === curSong && playing && !showPlaylist;
    const isActive = actualIdx === curSong && !showPlaylist;
    const liked = isLiked(curPlaylist, actualIdx);

    return `
    <div class="song-row ${isActive ? "playing" : ""}"
         onclick="${showPlaylist ? `loadPlaylist(${i}); playAll()` : `playSong(${actualIdx})`}">
      <div class="song-num-wrap">
        <span class="row-num">${isPlaying ? "" : i + 1}</span>
        <div class="row-wave" style="${isPlaying ? "display:flex" : ""}">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="row-play-icon"><i class="fas fa-play"></i></div>
      </div>
      <div class="song-title-cell">
        <div class="song-emoji">${song.emoji || "🎵"}</div>
        <div>
          <div class="song-name">${song.title}</div>
          <div class="song-album">${song.album || ""}</div>
        </div>
      </div>
      <div class="song-artist-cell">${song.artist}</div>
      <div class="song-dur">${song.duration}</div>
      <button class="song-like-btn ${liked ? "liked" : ""}"
              onclick="event.stopPropagation(); toggleSongLike(${actualIdx})">
        <i class="${liked ? "fas" : "far"} fa-heart"></i>
      </button>
    </div>`;
  }).join("");
}

// ── RENDER PLAYLIST CARDS ─────────────────
function renderPlaylistCards() {
  const el = document.getElementById("playlistCards");
  el.innerHTML = playlists.map((pl, i) => `
    <div class="pl-card" onclick="loadPlaylist(${i}); playAll()">
      <div class="pl-card-art" style="background:${pl.color}22">${pl.emoji}</div>
      <div class="pl-card-name">${pl.name}</div>
      <div class="pl-card-count">${pl.songs.length} songs</div>
    </div>`
  ).join("");
}

// ── PLAY A SONG ───────────────────────────
function playSong(idx) {
  const song = playlists[curPlaylist].songs[idx];
  if (!song) return;

  curSong = idx;
  audio.src = song.src;
  audio.play().catch(() => {});
  playing = true;

  updatePlayerBar(song);
  renderSongs(playlists[curPlaylist].songs);
  document.getElementById("vinyl").classList.add("playing");
  document.getElementById("playPauseBtn").innerHTML = `<i class="fas fa-pause"></i>`;

  // Sidebar now playing
  document.getElementById("snpTitle").textContent = song.title;
  document.getElementById("snpArtist").textContent = song.artist;
  document.getElementById("snpCover").textContent = song.emoji || "🎵";
}

function playAll() {
  playSong(0);
}

// ── PLAYER BAR UPDATE ─────────────────────
function updatePlayerBar(song) {
  document.getElementById("npTitle").textContent = song.title;
  document.getElementById("npArtist").textContent = song.artist;
  document.getElementById("nowPlayingEmoji").textContent = song.emoji || "🎵";
  document.getElementById("nowPlayingArt").classList.add("has-song");

  // Like button state
  const liked = isLiked(curPlaylist, curSong);
  const lb = document.getElementById("likeBtn");
  lb.className = `like-btn ${liked ? "liked" : ""}`;
  lb.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
}

// ── PLAY / PAUSE ──────────────────────────
function togglePlay() {
  if (curSong === -1) { playAll(); return; }
  if (playing) {
    audio.pause(); playing = false;
    document.getElementById("playPauseBtn").innerHTML = `<i class="fas fa-play"></i>`;
    document.getElementById("vinyl").classList.remove("playing");
  } else {
    audio.play(); playing = true;
    document.getElementById("playPauseBtn").innerHTML = `<i class="fas fa-pause"></i>`;
    document.getElementById("vinyl").classList.add("playing");
  }
}

// ── NEXT / PREV ───────────────────────────
function nextSong() {
  const pl = playlists[curPlaylist];
  let next = shuffle
    ? Math.floor(Math.random() * pl.songs.length)
    : (curSong + 1) % pl.songs.length;
  playSong(next);
}
function prevSong() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  const pl = playlists[curPlaylist];
  const prev = (curSong - 1 + pl.songs.length) % pl.songs.length;
  playSong(prev);
}

audio.addEventListener("ended", () => { if (!repeat) nextSong(); });

// ── SHUFFLE / REPEAT ──────────────────────
function toggleShuffle() {
  shuffle = !shuffle;
  document.getElementById("shuffleBtn").classList.toggle("active", shuffle);
}
function toggleRepeat() {
  repeat = !repeat;
  audio.loop = repeat;
  document.getElementById("repeatBtn").classList.toggle("active", repeat);
}

// ── MUTE ──────────────────────────────────
function toggleMute() {
  muted = !muted;
  audio.volume = muted ? 0 : lastVol;
  document.getElementById("muteBtn").innerHTML =
    `<i class="fas fa-volume-${muted ? "xmark" : "high"}"></i>`;
  document.getElementById("volFill").style.width = (muted ? 0 : lastVol * 100) + "%";
}

// ── PROGRESS ──────────────────────────────
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById("progFill").style.width = pct + "%";
  document.getElementById("progDot").style.left = pct + "%";
  document.getElementById("curTime").textContent = fmt(audio.currentTime);
  document.getElementById("durTime").textContent = fmt(audio.duration);
});

function seekTo(e) {
  const rect = document.getElementById("progTrack").getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * audio.duration;
}

function setVol(e) {
  const rect = document.getElementById("volTrack").getBoundingClientRect();
  const vol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.volume = vol;
  lastVol = vol;
  muted = false;
  document.getElementById("volFill").style.width = vol * 100 + "%";
  document.getElementById("muteBtn").innerHTML = `<i class="fas fa-volume-high"></i>`;
}

function fmt(s) {
  if (isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ── LIKE / HEART ──────────────────────────
function isLiked(pIdx, sIdx) {
  return likedSongs.some((l) => l.playlistIndex === pIdx && l.songIndex === sIdx);
}

function toggleLike() {
  if (curSong === -1) return;
  toggleSongLike(curSong);
}

function toggleSongLike(sIdx) {
  const pIdx = curPlaylist;
  const song = playlists[pIdx].songs[sIdx];
  const existingIdx = likedSongs.findIndex(
    (l) => l.playlistIndex === pIdx && l.songIndex === sIdx
  );

  if (existingIdx >= 0) {
    likedSongs.splice(existingIdx, 1);
  } else {
    likedSongs.push({ playlistIndex: pIdx, songIndex: sIdx, song });
  }

  // Re-render current song list
  if (currentSection === "home") renderSongs(playlists[curPlaylist].songs);
  if (currentSection === "library") renderLibrary();
  updateLibraryCount();

  // Update player bar like button if this is the current song
  if (sIdx === curSong) {
    const liked = isLiked(pIdx, sIdx);
    const lb = document.getElementById("likeBtn");
    lb.className = `like-btn ${liked ? "liked" : ""}`;
    lb.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
  }
}

// ── LIBRARY ───────────────────────────────
function renderLibrary() {
  const el = document.getElementById("likedList");
  if (!likedSongs.length) {
    el.innerHTML = `
      <div class="empty-library">
        <div class="empty-icon">💜</div>
        <p>No liked songs yet</p>
        <span>Hit the ♥ on any song to save it here</span>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="song-table-header">
      <span>#</span><span>TITLE</span><span>ARTIST</span>
      <span><i class="fas fa-clock"></i></span><span></span>
    </div>` +
    likedSongs.map(({ song, playlistIndex, songIndex }, i) => `
      <div class="song-row" onclick="curPlaylist=${playlistIndex}; playSong(${songIndex})">
        <div class="song-num-wrap"><span class="row-num">${i + 1}</span>
          <div class="row-play-icon"><i class="fas fa-play"></i></div>
        </div>
        <div class="song-title-cell">
          <div class="song-emoji">${song.emoji || "🎵"}</div>
          <div>
            <div class="song-name">${song.title}</div>
            <div class="song-album">${playlists[playlistIndex].name}</div>
          </div>
        </div>
        <div class="song-artist-cell">${song.artist}</div>
        <div class="song-dur">${song.duration}</div>
        <button class="song-like-btn liked"
                onclick="event.stopPropagation(); curPlaylist=${playlistIndex}; toggleSongLike(${songIndex})">
          <i class="fas fa-heart"></i>
        </button>
      </div>`
    ).join("");
}

function updateLibraryCount() {
  const count = likedSongs.length;
  document.getElementById("likedCount").textContent = `${count} song${count !== 1 ? "s" : ""} liked`;
}

// ── SEARCH ────────────────────────────────
function bindSearch() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");

  input.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    clearBtn.classList.toggle("visible", q.length > 0);

    if (!q) {
      if (currentSection === "search") showSection("home");
      return;
    }

    showSection("search");

    // Search across ALL playlists
    const results = [];
    playlists.forEach((pl, pIdx) => {
      pl.songs.forEach((song, sIdx) => {
        if (
          song.title.toLowerCase().includes(q) ||
          song.artist.toLowerCase().includes(q) ||
          pl.name.toLowerCase().includes(q)
        ) {
          results.push({ song, pIdx, sIdx, plName: pl.name });
        }
      });
    });

    renderSearchResults(results, q);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") clearSearch();
  });
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchClear").classList.remove("visible");
  showSection("home");
}

function renderSearchResults(results, query) {
  const el = document.getElementById("searchResults");

  if (!results.length) {
    el.innerHTML = `
      <div class="search-empty">
        <div style="font-size:2.5rem;margin-bottom:12px">🔍</div>
        <p>No results for "<strong>${query}</strong>"</p>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="search-tag">${results.length} RESULT${results.length !== 1 ? "S" : ""}</div>
    <div class="song-table-header">
      <span>#</span><span>TITLE</span><span>ARTIST</span>
      <span><i class="fas fa-clock"></i></span><span></span>
    </div>` +
    results.map(({ song, pIdx, sIdx }, i) => {
      const liked = likedSongs.some((l) => l.playlistIndex === pIdx && l.songIndex === sIdx);
      return `
      <div class="song-row" onclick="curPlaylist=${pIdx}; playSong(${sIdx})">
        <div class="song-num-wrap">
          <span class="row-num">${i + 1}</span>
          <div class="row-play-icon"><i class="fas fa-play"></i></div>
        </div>
        <div class="song-title-cell">
          <div class="song-emoji">${song.emoji || "🎵"}</div>
          <div>
            <div class="song-name">${highlightMatch(song.title, query)}</div>
            <div class="song-album">${playlists[pIdx].name}</div>
          </div>
        </div>
        <div class="song-artist-cell">${highlightMatch(song.artist, query)}</div>
        <div class="song-dur">${song.duration}</div>
        <button class="song-like-btn ${liked ? "liked" : ""}"
                onclick="event.stopPropagation(); curPlaylist=${pIdx}; toggleSongLike(${sIdx})">
          <i class="${liked ? "fas" : "far"} fa-heart"></i>
        </button>
      </div>`;
    }).join("");
}

function highlightMatch(text, query) {
  const re = new RegExp(`(${query})`, "gi");
  return text.replace(re, `<mark style="background:rgba(185,79,255,0.35);color:white;border-radius:3px;padding:0 2px">$1</mark>`);
}

// ── SIDEBAR PLAYLIST CLICKS ───────────────
function bindSidebarPlaylists() {
  document.querySelectorAll(".playlist-item").forEach((el) => {
    el.addEventListener("click", () => loadPlaylist(parseInt(el.dataset.playlist)));
  });
}

// ── START ─────────────────────────────────
init();
