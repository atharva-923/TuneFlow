// ============================================================
//  TUNEFLOW v3 — app.js
//  Powered by Jamendo API — Real songs, real artists!
//  Client ID: a72d03df
// ============================================================

const JAMENDO_ID = "a72d03df";
const JAMENDO   = "https://api.jamendo.com/v3.0";

// ── STATE ─────────────────────────────────
let songs        = [];       // current tracklist
let curIdx       = -1;       // index in songs[]
let playing      = false;
let shuffle      = false;
let repeat       = false;
let muted        = false;
let lastVol      = 0.8;
let likedSongs   = JSON.parse(localStorage.getItem("tf_liked") || "[]");
let curGenre     = "lofi";
let searchTimer  = null;
let currentSection = "home";

const audio = document.getElementById("audio");
audio.volume = 0.8;

// ── GENRE CONFIG ──────────────────────────
const genres = [
  { id: "lofi",       label: "Lo-fi",       emoji: "🌙", color: "#b94fff", tags: "lofi" },
  { id: "pop",        label: "Pop",          emoji: "🎤", color: "#00d4ff", tags: "pop" },
  { id: "rock",       label: "Rock",         emoji: "🎸", color: "#ff6b6b", tags: "rock" },
  { id: "hiphop",     label: "Hip-Hop",      emoji: "🎧", color: "#f59e0b", tags: "hiphop" },
  { id: "electronic", label: "Electronic",   emoji: "⚡", color: "#43e97b", tags: "electronic" },
  { id: "jazz",       label: "Jazz",         emoji: "🎷", color: "#ec4899", tags: "jazz" },
];

// ── BOOT ──────────────────────────────────
function init() {
  renderGenreCards();
  loadGenre("lofi", document.querySelector(".playlist-item"));
  bindSearch();
}

// ── FETCH FROM JAMENDO ────────────────────
async function fetchTracks(params) {
  const url = new URL(`${JAMENDO}/tracks/`);
  url.searchParams.set("client_id", JAMENDO_ID);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "20");
  url.searchParams.set("audioformat", "mp32");
  url.searchParams.set("imagesize", "200");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res  = await fetch(url.toString());
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error("Jamendo fetch error:", e);
    return [];
  }
}

// ── LOAD GENRE ────────────────────────────
async function loadGenre(genreId, el) {
  curGenre = genreId;
  curIdx = -1;
  const g = genres.find(x => x.id === genreId);

  // Sidebar active
  document.querySelectorAll(".playlist-item").forEach(li => li.classList.remove("active"));
  if (el) el.classList.add("active");

  // Banner
  document.getElementById("bannerTitle").textContent = g.label;
  document.getElementById("bannerMeta").textContent = "Real songs from Jamendo • Free & Legal";
  document.getElementById("sectionTitle").textContent = g.label + " Tracks";
  document.getElementById("banner").style.background =
    `linear-gradient(135deg, #0e0820 0%, ${g.color}22 60%, #080810 100%)`;

  showSection("home");
  showLoading();

  const tracks = await fetchTracks({ tags: g.tags, orderby: "popularity_total" });
  songs = tracks;
  renderSongs(songs, "songList");
  document.getElementById("songCount").textContent = `${songs.length} songs`;
}

// ── RENDER SONGS ──────────────────────────
function renderSongs(list, containerId) {
  const el = document.getElementById(containerId);
  if (!list.length) {
    el.innerHTML = `<div class="search-empty"><div style="font-size:2rem;margin-bottom:10px">😔</div><p>No songs found</p></div>`;
    return;
  }

  el.innerHTML = list.map((song, i) => {
    const isActive  = i === curIdx && containerId === "songList";
    const isPlaying = isActive && playing;
    const liked     = isLiked(song.id);
    const dur       = fmtSec(song.duration);
    const cover     = song.album_image || "";

    return `
    <div class="song-row ${isActive ? "playing" : ""}" onclick="playSongObj(${i}, '${containerId}')">
      <div class="song-num-wrap">
        <span class="row-num">${isPlaying ? "" : i + 1}</span>
        <div class="row-wave" style="${isPlaying ? "display:flex" : ""}">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="row-play-icon"><i class="fas fa-play"></i></div>
      </div>
      <div class="song-title-cell">
        <div class="song-cover-wrap">
          ${cover
            ? `<img src="${cover}" alt="" class="song-cover-img" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/>
               <div class="song-cover-fallback" style="display:none">🎵</div>`
            : `<div class="song-cover-fallback">🎵</div>`
          }
        </div>
        <div>
          <div class="song-name">${song.name}</div>
          <div class="song-album">${song.album_name || ""}</div>
        </div>
      </div>
      <div class="song-artist-cell">${song.artist_name}</div>
      <div class="song-dur">${dur}</div>
      <button class="song-like-btn ${liked ? "liked" : ""}"
              onclick="event.stopPropagation(); toggleSongLike('${song.id}', ${i})">
        <i class="${liked ? "fas" : "far"} fa-heart"></i>
      </button>
    </div>`;
  }).join("");
}

// ── PLAY ──────────────────────────────────
function playSongObj(idx, containerId = "songList") {
  // If playing from search results, load those songs
  if (containerId === "searchResults") {
    const searchSongs = window._searchSongs || [];
    if (searchSongs.length) { songs = searchSongs; }
  }
  if (containerId === "likedList") {
    songs = likedSongs.map(l => l.track);
  }

  const song = songs[idx];
  if (!song || !song.audio) {
    showToast("⚠️ This track has no preview available");
    return;
  }

  curIdx = idx;
  audio.src = song.audio;
  audio.play().catch(() => showToast("Click play to start"));
  playing = true;

  updatePlayerBar(song);
  renderSongs(songs, containerId === "searchResults" ? "searchResults" : "songList");
  document.getElementById("vinyl").classList.add("playing");
  document.getElementById("playPauseBtn").innerHTML = `<i class="fas fa-pause"></i>`;
}

function playAll() { if (songs.length) playSongObj(0); }

// ── PLAYER BAR ────────────────────────────
function updatePlayerBar(song) {
  document.getElementById("npTitle").textContent   = song.name;
  document.getElementById("npArtist").textContent  = song.artist_name;
  document.getElementById("snpTitle").textContent  = song.name;
  document.getElementById("snpArtist").textContent = song.artist_name;

  // Album art
  const img  = document.getElementById("nowPlayingImg");
  const icon = document.getElementById("nowPlayingIcon");
  if (song.album_image) {
    img.src           = song.album_image;
    img.style.display = "block";
    icon.style.display = "none";
    document.getElementById("snpCover").innerHTML = `<img src="${song.album_image}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;"/>`;
  } else {
    img.style.display  = "none";
    icon.style.display = "block";
  }

  document.getElementById("nowPlayingArt").classList.add("has-song");

  // Like btn
  const liked = isLiked(song.id);
  const lb = document.getElementById("likeBtn");
  lb.className  = `like-btn ${liked ? "liked" : ""}`;
  lb.innerHTML  = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
}

// ── CONTROLS ──────────────────────────────
function togglePlay() {
  if (curIdx === -1) { playAll(); return; }
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

function nextSong() {
  if (!songs.length) return;
  const next = shuffle
    ? Math.floor(Math.random() * songs.length)
    : (curIdx + 1) % songs.length;
  playSongObj(next);
}
function prevSong() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  const prev = (curIdx - 1 + songs.length) % songs.length;
  playSongObj(prev);
}

audio.addEventListener("ended", () => { if (!repeat) nextSong(); });

function toggleShuffle() {
  shuffle = !shuffle;
  document.getElementById("shuffleBtn").classList.toggle("active", shuffle);
}
function toggleRepeat() {
  repeat = !repeat;
  audio.loop = repeat;
  document.getElementById("repeatBtn").classList.toggle("active", repeat);
}
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
  document.getElementById("progDot").style.left   = pct + "%";
  document.getElementById("curTime").textContent  = fmt(audio.currentTime);
  document.getElementById("durTime").textContent  = fmt(audio.duration);
});

function seekTo(e) {
  const rect = document.getElementById("progTrack").getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * audio.duration;
}
function setVol(e) {
  const rect = document.getElementById("volFill").parentElement.getBoundingClientRect();
  const vol  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.volume = vol; lastVol = vol; muted = false;
  document.getElementById("volFill").style.width = vol * 100 + "%";
  document.getElementById("muteBtn").innerHTML = `<i class="fas fa-volume-high"></i>`;
}

// ── LIKE ──────────────────────────────────
function isLiked(id) { return likedSongs.some(l => l.id === id); }

function saveLiked() { localStorage.setItem("tf_liked", JSON.stringify(likedSongs)); }

function toggleLike() {
  if (curIdx === -1 || !songs[curIdx]) return;
  toggleSongLike(songs[curIdx].id, curIdx);
}

function toggleSongLike(trackId, idx) {
  const song  = songs[idx];
  const exist = likedSongs.findIndex(l => l.id === trackId);
  if (exist >= 0) {
    likedSongs.splice(exist, 1);
    showToast("Removed from Liked Songs");
  } else {
    likedSongs.push({ id: trackId, track: song });
    showToast("❤️ Added to Liked Songs");
  }
  saveLiked();
  updateLikedCount();

  // Re-render
  renderSongs(songs, "songList");
  if (currentSection === "library") renderLibrary();

  // Player bar
  if (idx === curIdx) {
    const liked = isLiked(trackId);
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

  const list = likedSongs.map(l => l.track);
  el.innerHTML = `
    <div class="song-table-header">
      <span>#</span><span>TITLE</span><span>ARTIST</span>
      <span><i class="fas fa-clock"></i></span><span></span>
    </div>` +
    list.map((song, i) => {
      const dur = fmtSec(song.duration);
      return `
      <div class="song-row" onclick="songs=window._likedTracks; curIdx=${i}; playSongObj(${i}, 'likedList')">
        <div class="song-num-wrap">
          <span class="row-num">${i + 1}</span>
          <div class="row-play-icon"><i class="fas fa-play"></i></div>
        </div>
        <div class="song-title-cell">
          <div class="song-cover-wrap">
            ${song.album_image
              ? `<img src="${song.album_image}" class="song-cover-img"/>`
              : `<div class="song-cover-fallback">🎵</div>`}
          </div>
          <div>
            <div class="song-name">${song.name}</div>
            <div class="song-album">${song.album_name || ""}</div>
          </div>
        </div>
        <div class="song-artist-cell">${song.artist_name}</div>
        <div class="song-dur">${dur}</div>
        <button class="song-like-btn liked"
                onclick="event.stopPropagation(); likedSongs.splice(${i},1); saveLiked(); renderLibrary(); updateLikedCount()">
          <i class="fas fa-heart"></i>
        </button>
      </div>`;
    }).join("");

  window._likedTracks = list;
}

function updateLikedCount() {
  const c = likedSongs.length;
  document.getElementById("likedCount").textContent = `${c} song${c !== 1 ? "s" : ""} liked`;
}

// ── SEARCH ────────────────────────────────
function bindSearch() {
  const input    = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");

  input.addEventListener("input", e => {
    const q = e.target.value.trim();
    clearBtn.classList.toggle("visible", q.length > 0);
    clearTimeout(searchTimer);

    if (!q) { showSection("home"); return; }

    showSection("search");
    document.getElementById("searchResults").innerHTML = `
      <div class="loading-state"><div class="spinner"></div><p>Searching Jamendo...</p></div>`;

    searchTimer = setTimeout(() => doSearch(q), 500);
  });

  input.addEventListener("keydown", e => { if (e.key === "Escape") clearSearch(); });
}

async function doSearch(query) {
  const tracks = await fetchTracks({ namesearch: query, orderby: "popularity_total" });
  window._searchSongs = tracks;

  const el = document.getElementById("searchResults");
  if (!tracks.length) {
    el.innerHTML = `
      <div class="search-empty">
        <div style="font-size:2.5rem;margin-bottom:12px">🔍</div>
        <p>No results for "<strong>${query}</strong>"</p>
        <span>Try a different search term</span>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="search-tag">${tracks.length} RESULTS FROM JAMENDO</div>
    <div class="song-table-header">
      <span>#</span><span>TITLE</span><span>ARTIST</span>
      <span><i class="fas fa-clock"></i></span><span></span>
    </div>` +
    tracks.map((song, i) => {
      const dur   = fmtSec(song.duration);
      const liked = isLiked(song.id);
      return `
      <div class="song-row" onclick="songs=window._searchSongs; playSongObj(${i}, 'searchResults')">
        <div class="song-num-wrap">
          <span class="row-num">${i + 1}</span>
          <div class="row-play-icon"><i class="fas fa-play"></i></div>
        </div>
        <div class="song-title-cell">
          <div class="song-cover-wrap">
            ${song.album_image
              ? `<img src="${song.album_image}" class="song-cover-img"/>`
              : `<div class="song-cover-fallback">🎵</div>`}
          </div>
          <div>
            <div class="song-name">${song.name}</div>
            <div class="song-album">${song.album_name || ""}</div>
          </div>
        </div>
        <div class="song-artist-cell">${song.artist_name}</div>
        <div class="song-dur">${dur}</div>
        <button class="song-like-btn ${liked ? "liked" : ""}"
                onclick="event.stopPropagation(); songs=window._searchSongs; toggleSongLike('${song.id}', ${i})">
          <i class="${liked ? "fas" : "far"} fa-heart"></i>
        </button>
      </div>`;
    }).join("");
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchClear").classList.remove("visible");
  window._searchSongs = [];
  showSection("home");
}

// ── GENRE CARDS ───────────────────────────
function renderGenreCards() {
  const el = document.getElementById("genreCards");
  el.innerHTML = genres.map(g => `
    <div class="pl-card" onclick="loadGenre('${g.id}', null)">
      <div class="pl-card-art" style="background:${g.color}22;font-size:3rem">${g.emoji}</div>
      <div class="pl-card-name">${g.label}</div>
      <div class="pl-card-count">Powered by Jamendo</div>
    </div>`
  ).join("");
}

// ── SECTION SWITCH ────────────────────────
function showSection(name) {
  currentSection = name;
  ["home", "search", "library"].forEach(s => {
    document.getElementById(`section-${s}`).style.display = s === name ? "block" : "none";
  });
  ["nav-home", "nav-search", "nav-library"].forEach((id, i) => {
    document.getElementById(id).classList.toggle("active", ["home","search","library"][i] === name);
  });
  if (name === "library") { renderLibrary(); updateLikedCount(); }
}

// ── UTILS ─────────────────────────────────
function showLoading() {
  document.getElementById("songList").innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading from Jamendo...</p>
    </div>`;
}

function fmt(s) {
  if (isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
function fmtSec(s) {
  if (!s) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

let toastTimer;
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = `
      position:fixed; bottom:110px; left:50%; transform:translateX(-50%);
      background:#1c1c35; border:1px solid rgba(185,79,255,0.3);
      color:#f0eeff; padding:10px 20px; border-radius:50px;
      font-size:0.85rem; z-index:999; transition:opacity 0.3s;
      font-family:'Plus Jakarta Sans',sans-serif;`;
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 2500);
}

// ── START ─────────────────────────────────
init();
