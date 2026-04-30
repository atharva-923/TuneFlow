// ============================================================
//  TUNEFLOW v6 — app.js
//  Two-panel editorial layout
//  Features: Queue, Recently Played, Liked, Upload,
//            Sleep Timer, Crossfade, Keyboard Shortcuts, Mobile
// ============================================================

const JAMENDO_ID = "a72d03df";
const JAMENDO   = "https://api.jamendo.com/v3.0";

// ── STATE ─────────────────────────────────────────────
let songs          = [];
let curIdx         = -1;
let playing        = false;
let shuffle        = false;
let repeat         = false;
let muted          = false;
let lastVol        = 0.8;
let likedSongs     = JSON.parse(localStorage.getItem("tf_liked")    || "[]");
let recentlyPlayed = JSON.parse(localStorage.getItem("tf_recent")   || "[]");
let queue          = [];
let myMusic        = JSON.parse(localStorage.getItem("tf_mymusic")  || "[]");
let curGenre       = "lofi";
let searchTimer    = null;
let currentSection = "home";

// Sleep timer
let sleepTimer    = null;
let sleepMins     = 0;
let sleepInterval = null;

// Crossfade
let crossfadeSecs   = parseInt(localStorage.getItem("tf_crossfade") || "3");
let crossfadeActive = false;

const audio = document.getElementById("audio");
audio.volume = 0.8;

// ── GENRES ────────────────────────────────────────────
const genres = [
  { id: "lofi",       label: "Lo-fi",      tags: "lofi" },
  { id: "pop",        label: "Pop",        tags: "pop" },
  { id: "rock",       label: "Rock",       tags: "rock" },
  { id: "hiphop",     label: "Hip-Hop",    tags: "hiphop" },
  { id: "electronic", label: "Electronic", tags: "electronic" },
  { id: "jazz",       label: "Jazz",       tags: "jazz" },
];

// ── BOOT ──────────────────────────────────────────────
function init() {
  renderGenreChips();
  renderMobileSidebarGenres();
  loadGenre("lofi");
  bindSearch();
  setupUpload();
  setupCrossfade();
  setupKeyboard();
  renderQueue();
  renderRecent();
  loadCrossfadePref();
  document.addEventListener("click", e => {
    if (!e.target.closest(".crossfade-wrap")) {
      document.getElementById("crossfadeMenu")?.classList.remove("open");
    }
  });
}

// ── GENRE CHIPS (left panel) ──────────────────────────
function renderGenreChips() {
  const el = document.getElementById("genreChips");
  if (!el) return;
  el.innerHTML = genres.map(g => `
    <div class="chip ${g.id === curGenre ? "active" : ""}"
         onclick="loadGenre('${g.id}')">${g.label}</div>
  `).join("");
}

function renderMobileSidebarGenres() {
  const el = document.getElementById("msbGenres");
  if (!el) return;
  el.innerHTML = genres.map(g => `
    <div class="msb-genre-item ${g.id === curGenre ? "active" : ""}"
         onclick="loadGenre('${g.id}');closeMobileSidebar()">
      <div class="msb-dot ${g.id === curGenre ? "active" : ""}"></div>
      ${g.label}
    </div>
  `).join("");
}

// ── FETCH FROM JAMENDO ────────────────────────────────
async function fetchTracks(params) {
  const url = new URL(`${JAMENDO}/tracks/`);
  url.searchParams.set("client_id", JAMENDO_ID);
  url.searchParams.set("format",      "json");
  url.searchParams.set("limit",       "20");
  url.searchParams.set("audioformat", "mp32");
  url.searchParams.set("imagesize",   "200");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res  = await fetch(url.toString());
    const data = await res.json();
    return data.results || [];
  } catch { return []; }
}

// ── LOAD GENRE ────────────────────────────────────────
async function loadGenre(genreId) {
  curGenre = genreId;
  renderGenreChips();
  renderMobileSidebarGenres();
  // Only redirect to home if the user isn't already there
  if (currentSection !== "home") showSection("home");

  // update now-pill
  const g = genres.find(x => x.id === genreId);
  const pill = document.getElementById("nowPill");
  if (pill) pill.textContent = `● ${g.label}`;

  showLoading();
  const tracks = await fetchTracks({ tags: g.tags, orderby: "popularity_total" });
  songs = tracks;
  renderSongList(songs);
}

// ── RENDER SONG LIST (left panel compact rows) ─────────
function renderSongList(list) {
  const el = document.getElementById("songList");
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-music"></i><p>No songs found</p></div>`;
    return;
  }
  el.innerHTML = list.map((song, i) => {
    const isActive = i === curIdx;
    const liked    = isLiked(song.id);
    const dur      = song.duration ? fmt(song.duration) : "—";
    const name     = song.name || song.title || "Unknown";
    const artist   = song.artist_name || song.artist || "Unknown";

    return `
    <div class="srow ${isActive ? "active" : ""}" onclick="playSong(${i})">
      <div style="display:flex;align-items:center;justify-content:center">
        <div class="mwave"><b></b><b></b><b></b></div>
        <span class="srow-n">${i + 1}</span>
      </div>
      <div class="srow-info">
        <p class="srow-name">${name}</p>
        <p class="srow-artist">${artist}</p>
      </div>
      <span class="srow-dur">${dur}</span>
      <button class="srow-like ${liked ? "liked fas" : "far"} fa-heart"
              onclick="event.stopPropagation();toggleSongLike('${song.id}',${i})"></button>
    </div>`;
  }).join("");
}

// ── PLAY ──────────────────────────────────────────────
function playSong(idx, list) {
  if (list) songs = list;
  const song = songs[idx];
  if (!song) return;
  const src = song.audio || song.src || "";
  if (!src) { showToast("⚠️ No audio for this track"); return; }

  curIdx  = idx;
  audio.src = src.startsWith("http:") ? src.replace("http:", "https:") : src;
  audio.play().catch(() => showToast("Tap play to start 🎵"));
  playing = true;
  crossfadeActive = false;

  updateNowPlaying(song);
  renderSongList(songs);
  addToRecent(song);
  renderQueue();
  syncMobileUI(song);
}

function playAll() { if (songs.length) playSong(0); }

// ── UPDATE NOW PLAYING (right panel) ──────────────────
function updateNowPlaying(song) {
  const name   = song.name || song.title || "Unknown";
  const artist = song.artist_name || song.artist || "Unknown";
  const cover  = song.album_image || song.cover || "";

  // Big art
  const artEl = document.getElementById("bigArt");
  if (artEl) {
    artEl.classList.add("bump");
    setTimeout(() => artEl.classList.remove("bump"), 250);
    if (cover) {
      artEl.innerHTML = `<img src="${cover}" alt=""/>`;
    } else {
      artEl.innerHTML = `<i class="fas fa-music"></i>`;
    }
  }

  // Title / artist
  const t = document.getElementById("bigTitle");
  const a = document.getElementById("bigArtistEl");
  if (t) t.textContent = name;
  if (a) a.textContent = artist;

  // Play button → pause icon
  const pb = document.getElementById("playPauseBtn");
  if (pb) pb.innerHTML = `<i class="fas fa-pause"></i>`;

  // Like button
  updateLikeBtn();

  // Notification
  showNowPlayingNotif(name, artist, cover);
}

// ── CONTROLS ──────────────────────────────────────────
function togglePlay() {
  if (curIdx === -1 && songs.length) { playSong(0); return; }
  if (curIdx === -1) return;
  if (playing) {
    audio.pause(); playing = false;
    setPlayIcons("play");
  } else {
    audio.play(); playing = true;
    setPlayIcons("pause");
  }
}

function setPlayIcons(icon) {
  const i = `<i class="fas fa-${icon}"></i>`;
  const pb  = document.getElementById("playPauseBtn");
  const mpb = document.getElementById("mpsPlayBtn");
  const mib = document.getElementById("miniPlayBtn");
  if (pb)  pb.innerHTML  = i;
  if (mpb) mpb.innerHTML = i;
  if (mib) mib.innerHTML = i;
}

function nextSong() {
  if (!songs.length) return;
  if (queue.length) {
    const next = queue.shift();
    // Play the queued track without mutating the songs array
    const tempList = [next, ...songs];
    playSong(0, tempList);
    renderQueue();
    return;
  }
  const next = shuffle
    ? Math.floor(Math.random() * songs.length)
    : (curIdx + 1) % songs.length;
  playSong(next);
}

function prevSong() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (!songs.length) return;
  playSong((curIdx - 1 + songs.length) % songs.length);
}

audio.addEventListener("ended", () => { if (repeat) { audio.play(); } else nextSong(); });

function toggleShuffle() {
  shuffle = !shuffle;
  document.getElementById("shuffleBtn")?.classList.toggle("active", shuffle);
  document.getElementById("mpsShuffleBtn")?.classList.toggle("active", shuffle);
  showToast(shuffle ? "🔀 Shuffle on" : "Shuffle off");
}

function toggleRepeat() {
  repeat = !repeat; audio.loop = repeat;
  document.getElementById("repeatBtn")?.classList.toggle("active", repeat);
  document.getElementById("mpsRepeatBtn")?.classList.toggle("active", repeat);
  showToast(repeat ? "🔁 Repeat on" : "Repeat off");
}

function toggleMute() {
  muted = !muted;
  audio.volume = muted ? 0 : lastVol;
  const icon = muted ? "xmark" : "high";
  document.getElementById("muteBtn")?.innerHTML && (document.getElementById("muteBtn").innerHTML = `<i class="fas fa-volume-${icon}"></i>`);
  const vf = document.getElementById("volFill");
  if (vf) vf.style.width = (muted ? 0 : lastVol * 100) + "%";
}

// ── PROGRESS ──────────────────────────────────────────
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;

  // Desktop progress
  const pf  = document.getElementById("progFill");
  const pd  = document.getElementById("progDot");
  const ct  = document.getElementById("curTime");
  const dt  = document.getElementById("durTime");
  if (pf) pf.style.width = pct + "%";
  if (pd) pd.style.left  = pct + "%";
  if (ct) ct.textContent = fmt(audio.currentTime);
  if (dt) dt.textContent = fmt(audio.duration);

  // Mobile progress
  const mpf = document.getElementById("mpsProgFill");
  const mct = document.getElementById("mpsCurTime");
  const mdt = document.getElementById("mpsDurTime");
  if (mpf) mpf.style.width = pct + "%";
  if (mct) mct.textContent = fmt(audio.currentTime);
  if (mdt) mdt.textContent = fmt(audio.duration);
});

function seekTo(e) {
  const track = e.currentTarget;
  const rect  = track.getBoundingClientRect();
  const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (audio.duration) audio.currentTime = pct * audio.duration;
}

function setVol(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const vol  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.volume = vol; lastVol = vol; muted = false;
  document.getElementById("volFill").style.width = vol * 100 + "%";
  document.getElementById("muteBtn").innerHTML = `<i class="fas fa-volume-high"></i>`;
}

// ── LIKE ──────────────────────────────────────────────
function isLiked(id) { return likedSongs.some(l => l.id == id); }
function saveLiked() { localStorage.setItem("tf_liked", JSON.stringify(likedSongs)); }

function updateLikeBtn() {
  if (curIdx === -1 || !songs[curIdx]) return;
  const liked = isLiked(songs[curIdx].id);
  const lb  = document.getElementById("likeBtn");
  const mlb = document.getElementById("mpsLikeBtn");
  if (lb)  {
    lb.className = `cbtn sm ${liked ? "active" : ""}`;
    lb.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
  }
  if (mlb) {
    mlb.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
    mlb.classList.toggle("liked", liked);
  }
}

function toggleLike() {
  if (curIdx === -1 || !songs[curIdx]) return;
  const song = songs[curIdx];
  const idx  = likedSongs.findIndex(l => l.id == song.id);
  if (idx >= 0) { likedSongs.splice(idx, 1); showToast("Removed from Liked Songs"); }
  else          { likedSongs.push({ id: song.id, track: song }); showToast("❤️ Added to Liked Songs"); }
  saveLiked();
  updateLikeBtn();
  renderSongList(songs);
  updateLikedCount();
  if (currentSection === "library") renderLibrary();
}

function toggleSongLike(trackId, idx) {
  const song  = songs[idx];
  const exist = likedSongs.findIndex(l => l.id == trackId);
  if (exist >= 0) { likedSongs.splice(exist, 1); showToast("Removed from Liked Songs"); }
  else            { likedSongs.push({ id: trackId, track: song }); showToast("❤️ Added to Liked Songs"); }
  saveLiked(); updateLikedCount();
  renderSongList(songs);
  if (idx === curIdx) updateLikeBtn();
  if (currentSection === "library") renderLibrary();
}

function updateLikedCount() {
  const c = likedSongs.length;
  const el = document.getElementById("likedCount");
  if (el) el.textContent = `${c} song${c !== 1 ? "s" : ""} liked`;
}

// ── QUEUE ─────────────────────────────────────────────
function addToQueue(idx, list) {
  const src  = list || songs;
  const song = src[idx];
  if (!song) return;
  queue.push(song);
  renderQueue();
  showToast(`➕ "${song.name || song.title}" added to queue`);
}

function removeFromQueue(i) { queue.splice(i, 1); renderQueue(); }
function clearQueue()       { queue = []; renderQueue(); showToast("Queue cleared"); }

function renderQueue() {
  const el    = document.getElementById("queueList");
  const badge = document.getElementById("queueCount");
  if (!el) return;
  if (badge) badge.textContent = queue.length ? `${queue.length}` : "";

  if (!queue.length) {
    el.innerHTML = `<div class="panel-empty"><i class="fas fa-list-ul"></i><p>Queue is empty</p></div>`;
    return;
  }
  el.innerHTML = queue.map((s, i) => {
    const cover = s.album_image || s.cover || "";
    return `
    <div class="queue-item" onclick="playSong(0, queue.splice(${i}).concat(songs))">
      <div class="queue-art">${cover ? `<img src="${cover}"/>` : `<i class="fas fa-music"></i>`}</div>
      <div class="queue-info">
        <p class="queue-title">${s.name || s.title}</p>
        <p class="queue-artist">${s.artist_name || s.artist}</p>
      </div>
      <button class="queue-remove" onclick="event.stopPropagation();removeFromQueue(${i})">
        <i class="fas fa-times"></i>
      </button>
    </div>`;
  }).join("");
}

// ── RECENTLY PLAYED ───────────────────────────────────
function addToRecent(song) {
  recentlyPlayed = recentlyPlayed.filter(r => r.id != song.id);
  recentlyPlayed.unshift({ id: song.id, track: song, time: Date.now() });
  if (recentlyPlayed.length > 20) recentlyPlayed.pop();
  localStorage.setItem("tf_recent", JSON.stringify(recentlyPlayed));
  renderRecent();
}

function renderRecent() {
  const el = document.getElementById("recentList");
  if (!el) return;
  if (!recentlyPlayed.length) {
    el.innerHTML = `<div class="panel-empty"><i class="fas fa-clock"></i><p>Nothing yet</p></div>`;
    return;
  }
  el.innerHTML = recentlyPlayed.map((r) => {
    const s = r.track;
    const cover = s.album_image || s.cover || "";
    return `
    <div class="queue-item">
      <div class="queue-art">${cover ? `<img src="${cover}"/>` : `<i class="fas fa-music"></i>`}</div>
      <div class="queue-info">
        <p class="queue-title">${s.name || s.title}</p>
        <p class="queue-artist">${s.artist_name || s.artist} · ${getTimeAgo(r.time)}</p>
      </div>
    </div>`;
  }).join("");
  // Wire clicks safely via event listeners
  el.querySelectorAll(".queue-item").forEach((item, i) => {
    item.addEventListener("click", () => {
      const track = recentlyPlayed[i]?.track;
      if (track) playSong(0, [track]);
    });
  });
}

function getTimeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return "just now";
  if (d < 3600000)  return Math.floor(d/60000) + "m ago";
  if (d < 86400000) return Math.floor(d/3600000) + "h ago";
  return Math.floor(d/86400000) + "d ago";
}

// ── NOW PLAYING NOTIFICATION ──────────────────────────
function showNowPlayingNotif(title, artist, cover) {
  const n = document.getElementById("nowNotif");
  if (!n) return;
  const artEl  = n.querySelector("#notifArt");
  const titleEl  = n.querySelector("#notifTitle");
  const artistEl = n.querySelector("#notifArtist");
  if (artEl)   artEl.innerHTML = cover ? `<img src="${cover}" style="width:100%;height:100%;object-fit:cover;border-radius:6px"/>` : `<i class="fas fa-music"></i>`;
  if (titleEl)  titleEl.textContent  = title;
  if (artistEl) artistEl.textContent = artist;
  n.classList.add("show");
  clearTimeout(n._t);
  n._t = setTimeout(() => n.classList.remove("show"), 3000);
}

// ── LIBRARY ───────────────────────────────────────────
function renderLibrary() {
  const el = document.getElementById("likedList");
  if (!el) return;
  if (!likedSongs.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-heart"></i><p>No liked songs yet</p><span>Hit ♥ on any song</span></div>`;
    return;
  }
  const list = likedSongs.map(l => l.track);
  el.innerHTML = `
    <div class="tbl-head" style="padding:5px 0 8px">
      <span>#</span><span>Title</span>
      <span style="text-align:right"><i class="fas fa-clock" style="font-size:0.65rem"></i></span>
      <span></span>
    </div>` +
    list.map((song, i) => {
      const cover = song.album_image || song.cover || "";
      const liked = true;
      return `
      <div class="srow" style="grid-template-columns:30px 1fr 56px 34px">
        <span class="srow-n">${i+1}</span>
        <div class="srow-info">
          <p class="srow-name">${song.name || song.title}</p>
          <p class="srow-artist">${song.artist_name || song.artist}</p>
        </div>
        <span class="srow-dur">${fmt(song.duration)}</span>
        <button class="srow-like liked fas fa-heart"
                onclick="event.stopPropagation();likedSongs.splice(${i},1);saveLiked();renderLibrary();updateLikedCount()"></button>
      </div>`;
    }).join("");
  // expose list for playSong
  window._likedList = list;
  // Fix onclick now that we have the list reference
  el.querySelectorAll(".srow").forEach((row, i) => {
    row.onclick = () => playSong(i, window._likedList);
  });
}

// ── SEARCH ────────────────────────────────────────────
function bindSearch() {
  const input    = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");
  if (!input) return;
  input.addEventListener("input", e => {
    const q = e.target.value.trim();
    if (clearBtn) clearBtn.style.display = q ? "block" : "none";
    clearTimeout(searchTimer);
    if (!q) { showSection("home"); return; }
    showSection("search");
    document.getElementById("searchResults").innerHTML =
      `<div class="loading-state"><div class="spinner"></div><p>Searching Jamendo…</p></div>`;
    searchTimer = setTimeout(() => doSearch(q), 480);
  });
  input.addEventListener("keydown", e => { if (e.key === "Escape") clearSearch(); });
}

async function doSearch(query) {
  const tracks = await fetchTracks({ namesearch: query, orderby: "popularity_total" });
  const el     = document.getElementById("searchResults");
  if (!tracks.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>No results for "${query}"</p></div>`;
    return;
  }
  window._searchSongs = tracks;
  el.innerHTML = `
    <p style="font-family:'Geist Mono',monospace;font-size:0.6rem;letter-spacing:1.8px;text-transform:uppercase;color:var(--sub);margin-bottom:14px">
      ${tracks.length} results from Jamendo
    </p>
    <div class="tbl-head" style="padding:5px 0 8px">
      <span>#</span><span>Title</span>
      <span style="text-align:right"><i class="fas fa-clock" style="font-size:0.65rem"></i></span>
      <span></span>
    </div>` +
    tracks.map((song, i) => {
      const liked = isLiked(song.id);
      return `
      <div class="srow" style="grid-template-columns:30px 1fr 56px 34px">
        <span class="srow-n">${i+1}</span>
        <div class="srow-info">
          <p class="srow-name">${song.name}</p>
          <p class="srow-artist">${song.artist_name}</p>
        </div>
        <span class="srow-dur">${fmt(song.duration)}</span>
        <button class="srow-like ${liked ? "liked fas" : "far"} fa-heart"
                onclick="event.stopPropagation();window._searchSongs&&toggleSearchLike('${song.id}',${i})"></button>
      </div>`;
    }).join("");
  // Wire click
  el.querySelectorAll(".srow").forEach((row, i) => {
    row.addEventListener("click", () => playSong(i, window._searchSongs));
  });
}

function toggleSearchLike(trackId, idx) {
  const song  = (window._searchSongs || [])[idx];
  if (!song) return;
  const exist = likedSongs.findIndex(l => l.id == trackId);
  if (exist >= 0) { likedSongs.splice(exist, 1); showToast("Removed from Liked Songs"); }
  else            { likedSongs.push({ id: trackId, track: song }); showToast("❤️ Added to Liked Songs"); }
  saveLiked(); updateLikedCount();
  doSearch(document.getElementById("searchInput").value);
}

function clearSearch() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");
  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  window._searchSongs = [];
  showSection("home");
}

// ── UPLOAD / MY MUSIC ─────────────────────────────────
function setupUpload() {
  const input = document.getElementById("musicUpload");
  if (!input) return;
  input.addEventListener("change", async e => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (!file.type.startsWith("audio/")) continue;
      const url   = URL.createObjectURL(file);
      const raw   = file.name.replace(/\.[^.]+$/, "");
      const parts = raw.split(" - ");
      const title  = parts.length > 1 ? parts[1].trim() : raw;
      const artist = parts.length > 1 ? parts[0].trim() : "My Music";
      const dur    = await getAudioDuration(url);
      const track  = {
        id: "local_" + Date.now() + Math.random(),
        name: title, title,
        artist_name: artist, artist,
        album_name: "My Uploads", album: "My Uploads",
        audio: url, src: url,
        cover: "", album_image: "",
        duration: Math.floor(dur),
        _isLocal: true,
      };
      if (!myMusic.some(m => m.name === track.name)) myMusic.push(track);
    }
    renderMyMusic();
    // Note: local blob URLs cannot be serialised to localStorage —
    // uploads are session-only and will be lost on page refresh.
    showToast(`✅ ${files.length} song${files.length > 1 ? "s" : ""} uploaded! (session only — reupload after refresh)`);
    input.value = "";
  });
}

function getAudioDuration(url) {
  return new Promise(resolve => {
    const a = new Audio(url);
    a.addEventListener("loadedmetadata", () => resolve(a.duration));
    a.addEventListener("error", () => resolve(0));
  });
}

function renderMyMusic() {
  const el = document.getElementById("myMusicList");
  if (!el) return;
  if (!myMusic.length) {
    el.innerHTML = `
      <div class="upload-prompt">
        <label for="musicUpload" class="upload-btn">
          <i class="fas fa-cloud-arrow-up"></i> Upload Music
        </label>
        <p>Supports MP3, WAV, OGG — name as <strong>Artist - Title.mp3</strong></p>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="upload-bar">
      <label for="musicUpload" class="upload-btn-small">
        <i class="fas fa-plus"></i> Add More
      </label>
      <button onclick="clearMyMusic()" class="clear-btn">
        <i class="fas fa-trash"></i> Clear All
      </button>
    </div>
    <div class="tbl-head" style="padding:5px 0 8px">
      <span>#</span><span>Title</span>
      <span style="text-align:right"><i class="fas fa-clock" style="font-size:0.65rem"></i></span>
      <span></span>
    </div>` +
    myMusic.map((song, i) => `
    <div class="srow" style="grid-template-columns:30px 1fr 56px 34px">
      <span class="srow-n">${i+1}</span>
      <div class="srow-info">
        <p class="srow-name">${song.name}</p>
        <p class="srow-artist">${song.artist_name}</p>
      </div>
      <span class="srow-dur">${fmt(song.duration)}</span>
      <button class="srow-like far fa-trash"
              onclick="event.stopPropagation();removeMyTrack(${i})"
              style="font-size:0.68rem;color:#e06c6c;opacity:0.7"></button>
    </div>`).join("");

  el.querySelectorAll(".srow").forEach((row, i) => {
    row.addEventListener("click", () => playSong(i, myMusic));
  });
}

function removeMyTrack(i) { myMusic.splice(i, 1); renderMyMusic(); showToast("Removed"); }
function clearMyMusic()   { myMusic = []; localStorage.removeItem("tf_mymusic"); renderMyMusic(); showToast("My Music cleared"); }

// ── SECTION SWITCH ────────────────────────────────────
function showSection(name) {
  currentSection = name;
  // desktop tabs
  ["home","search","library","mymusic"].forEach(s => {
    const el  = document.getElementById(`section-${s}`);
    const tab = document.getElementById(`nav-${s}`);
    const msb = document.getElementById(`msb-${s}`);
    if (el) el.style.display = s === name ? (s === "home" ? "flex" : "block") : "none";
    if (tab) tab.classList.toggle("active", s === name);
    if (msb) msb.classList.toggle("active", s === name);
  });
  if (name === "library") { renderLibrary(); updateLikedCount(); }
  if (name === "mymusic") renderMyMusic();
}

// ── PANELS ────────────────────────────────────────────
function togglePanel(name) {
  const panel  = document.getElementById(`panel-${name}`);
  const isOpen = panel.classList.contains("open");
  document.querySelectorAll(".side-panel").forEach(p => p.classList.remove("open"));
  if (!isOpen) panel.classList.add("open");
}

// ── MOBILE SIDEBAR ────────────────────────────────────
function openMobileSidebar() {
  document.getElementById("mobileSidebar")?.classList.add("open");
  document.getElementById("sidebarOverlay")?.classList.add("open");
}
function closeMobileSidebar() {
  document.getElementById("mobileSidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("open");
}
// Fix: show overlay properly
document.addEventListener("DOMContentLoaded", () => {});

// ── MOBILE PLAYER SHEET ───────────────────────────────
function openMobilePlayer() {
  document.getElementById("mobilePlayerSheet")?.classList.add("open");
  if (songs[curIdx]) syncMobileUI(songs[curIdx]);
}
function closeMobilePlayer() {
  document.getElementById("mobilePlayerSheet")?.classList.remove("open");
}

function syncMobileUI(song) {
  if (!song) return;
  const name   = song.name || song.title || "Unknown";
  const artist = song.artist_name || song.artist || "Unknown";
  const cover  = song.album_image || song.cover || "";

  // Sheet
  const mpsArt    = document.getElementById("mpsArt");
  const mpsTitle  = document.getElementById("mpsTitle");
  const mpsArtist = document.getElementById("mpsArtist");
  if (mpsArt)    mpsArt.innerHTML = cover ? `<img src="${cover}" style="width:100%;height:100%;object-fit:cover;border-radius:16px"/>` : `<i class="fas fa-music"></i>`;
  if (mpsTitle)  mpsTitle.textContent  = name;
  if (mpsArtist) mpsArtist.textContent = artist;

  // Mini player
  const miniArt    = document.getElementById("miniArt");
  const miniTitle  = document.getElementById("miniTitle");
  const miniArtist = document.getElementById("miniArtist");
  if (miniArt)    miniArt.innerHTML    = cover ? `<img src="${cover}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>` : `<i class="fas fa-music"></i>`;
  if (miniTitle)  miniTitle.textContent  = name;
  if (miniArtist) miniArtist.textContent = artist;

  setPlayIcons(playing ? "pause" : "play");
  updateLikeBtn();

  const msb = document.getElementById("mpsShuffleBtn");
  const mrb = document.getElementById("mpsRepeatBtn");
  if (msb) msb.classList.toggle("active", shuffle);
  if (mrb) mrb.classList.toggle("active", repeat);
}

// Swipe down to close mobile sheet
let _touchStartY = 0;
document.addEventListener("touchstart", e => {
  const sheet = document.getElementById("mobilePlayerSheet");
  if (sheet?.classList.contains("open")) _touchStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener("touchend", e => {
  const sheet = document.getElementById("mobilePlayerSheet");
  if (sheet?.classList.contains("open") && e.changedTouches[0].clientY - _touchStartY > 80) {
    closeMobilePlayer();
  }
}, { passive: true });

// Vol in mobile sheet
function setMpsVol(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const vol  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.volume = vol; lastVol = vol; muted = false;
  document.getElementById("mpsVolFill").style.width = vol * 100 + "%";
  document.getElementById("volFill").style.width    = vol * 100 + "%";
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────
function setupKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") return;
    switch (e.code) {
      case "Space":
        e.preventDefault(); togglePlay(); break;
      case "ArrowRight":
        if (e.shiftKey) { nextSong(); showToast("⏭ Next song"); }
        else { audio.currentTime = Math.min(audio.duration||0, audio.currentTime + 10); showToast("⏩ +10s"); }
        break;
      case "ArrowLeft":
        if (e.shiftKey) { prevSong(); showToast("⏮ Prev song"); }
        else { audio.currentTime = Math.max(0, audio.currentTime - 10); showToast("⏪ -10s"); }
        break;
      case "ArrowUp":
        e.preventDefault();
        audio.volume = Math.min(1, audio.volume + 0.1); lastVol = audio.volume;
        document.getElementById("volFill").style.width = audio.volume * 100 + "%";
        showToast(`🔊 ${Math.round(audio.volume * 100)}%`);
        break;
      case "ArrowDown":
        e.preventDefault();
        audio.volume = Math.max(0, audio.volume - 0.1); lastVol = audio.volume;
        document.getElementById("volFill").style.width = audio.volume * 100 + "%";
        showToast(`🔉 ${Math.round(audio.volume * 100)}%`);
        break;
      case "KeyM": toggleMute(); break;
      case "KeyL": toggleLike(); break;
      case "KeyS": toggleShuffle(); break;
      case "KeyR": toggleRepeat(); break;
    }
  });
}

function showKeyboardHelp() {
  document.getElementById("kbModal")?.classList.add("open");
}

// ── SLEEP TIMER ───────────────────────────────────────
function cycleSleepTimer() {
  if (sleepTimer) {
    clearTimeout(sleepTimer); clearInterval(sleepInterval);
    sleepTimer = null; sleepMins = 0;
    updateSleepBtn(); showToast("😴 Sleep timer off"); return;
  }
  const options = [15, 30, 45, 60];
  const curIdx  = options.indexOf(sleepMins);
  const nextIdx = (curIdx + 1) % options.length;
  // If we've cycled through all options (wrapped back to start), turn off
  if (curIdx === options.length - 1) {
    sleepMins = 0; updateSleepBtn(); showToast("😴 Sleep timer off"); return;
  }
  sleepMins = options[nextIdx];
  let remaining = sleepMins * 60;
  sleepTimer = setTimeout(() => {
    audio.pause(); playing = false;
    setPlayIcons("play");
    sleepTimer = null; sleepMins = 0;
    updateSleepBtn(); showToast("😴 Sleep timer — music stopped. Goodnight 🌙");
  }, sleepMins * 60 * 1000);
  sleepInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) { clearInterval(sleepInterval); return; }
    updateSleepBtn(remaining);
  }, 1000);
  updateSleepBtn(remaining);
  showToast(`😴 Stopping in ${sleepMins} min`);
}

function updateSleepBtn(remaining) {
  const btns = [document.getElementById("sleepBtn"), document.getElementById("mpsSleepBtn")];
  btns.forEach(btn => {
    if (!btn) return;
    if (!sleepTimer) {
      btn.innerHTML = `<i class="fas fa-moon"></i>${btn.tagName !== "BUTTON" || btn.closest(".mps-extras") ? "<span>Sleep</span>" : ""}`;
      btn.classList.remove("active");
    } else {
      const m = Math.floor(remaining / 60);
      const s = String(remaining % 60).padStart(2, "0");
      if (btn.closest(".mps-extras")) {
        btn.innerHTML = `<i class="fas fa-moon"></i><span>${m}:${s}</span>`;
      } else {
        btn.innerHTML = `<span class="sleep-countdown">${m}:${s}</span>`;
      }
      btn.classList.add("active");
    }
  });
}

// ── CROSSFADE ─────────────────────────────────────────
function setupCrossfade() {
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration || crossfadeSecs === 0) return;
    const timeLeft = audio.duration - audio.currentTime;
    if (timeLeft <= crossfadeSecs && timeLeft > 0 && !crossfadeActive && playing) {
      crossfadeActive = true;
      const steps = crossfadeSecs * 10;
      let step = 0;
      const origVol = audio.volume;
      const fade = setInterval(() => {
        step++;
        audio.volume = Math.max(0, origVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fade);
          audio.volume = origVol;
          crossfadeActive = false;
        }
      }, 100);
    }
    if (timeLeft > crossfadeSecs + 1) crossfadeActive = false;
  });
}

function loadCrossfadePref() {
  document.querySelectorAll(".cf-opt").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.secs) === crossfadeSecs);
  });
}

function setCrossfade(secs) {
  crossfadeSecs = secs;
  document.querySelectorAll(".cf-opt").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.secs) === secs);
  });
  document.getElementById("crossfadeMenu")?.classList.remove("open");
  showToast(secs === 0 ? "Crossfade off" : `🎚️ Crossfade: ${secs}s`);
  localStorage.setItem("tf_crossfade", secs);
}

function toggleCrossfadeMenu() {
  document.getElementById("crossfadeMenu")?.classList.toggle("open");
}

// ── UTILS ─────────────────────────────────────────────
function showLoading() {
  const el = document.getElementById("songList");
  if (el) el.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading from Jamendo…</p></div>`;
}

function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

let _toastTimer;
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 2500);
}

// ── START ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);