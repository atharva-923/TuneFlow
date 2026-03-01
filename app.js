// ============================================================
//  TUNEFLOW v4 — app.js
//  Features: Queue, Recently Played, Dynamic Theme,
//  Audio Visualizer, Mobile, Upload Your Own Music
// ============================================================

const JAMENDO_ID = "a72d03df";
const JAMENDO   = "https://api.jamendo.com/v3.0";

// ── STATE ─────────────────────────────────
let songs          = [];
let curIdx         = -1;
let playing        = false;
let shuffle        = false;
let repeat         = false;
let muted          = false;
let lastVol        = 0.8;
let likedSongs     = JSON.parse(localStorage.getItem("tf_liked") || "[]");
let recentlyPlayed = JSON.parse(localStorage.getItem("tf_recent") || "[]");
let queue          = [];
let myMusic        = JSON.parse(localStorage.getItem("tf_mymusic") || "[]");
let curGenre       = "lofi";
let searchTimer    = null;
let currentSection = "home";

// Audio visualizer
let audioCtx, analyser, source, animFrame;
let vizActive = false;

const audio = document.getElementById("audio");
audio.volume = 0.8;

// ── GENRE CONFIG ──────────────────────────
const genres = [
  { id: "lofi",       label: "Lo-fi",      emoji: "🌙", color: "#e8a830", tags: "lofi" },
  { id: "pop",        label: "Pop",         emoji: "🎤", color: "#d4a050", tags: "pop" },
  { id: "rock",       label: "Rock",        emoji: "🎸", color: "#c4601a", tags: "rock" },
  { id: "hiphop",     label: "Hip-Hop",     emoji: "🎧", color: "#d4803a", tags: "hiphop" },
  { id: "electronic", label: "Electronic",  emoji: "⚡", color: "#b8c860", tags: "electronic" },
  { id: "jazz",       label: "Jazz",        emoji: "🎷", color: "#c87840", tags: "jazz" },
];

// ── BOOT ──────────────────────────────────
function init() {
  renderGenreCards();
  loadGenre("lofi", document.querySelector(".playlist-item"));
  bindSearch();
  setupVisualizer();
  setupUpload();
  renderQueue();
  renderRecent();
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
    const res = await fetch(url.toString());
    const data = await res.json();
    return data.results || [];
  } catch (e) { return []; }
}

// ── LOAD GENRE ────────────────────────────
async function loadGenre(genreId, el) {
  curGenre = genreId;
  curIdx = -1;
  const g = genres.find(x => x.id === genreId);

  document.querySelectorAll(".playlist-item").forEach(li => li.classList.remove("active"));
  if (el) el.classList.add("active");

  document.getElementById("bannerTitle").textContent = g.label;
  document.getElementById("bannerMeta").textContent = "Real songs from Jamendo • Free & Legal";
  document.getElementById("sectionTitle").textContent = g.label + " Tracks";
  setDynamicTheme(g.color);

  showSection("home");
  showLoading();

  const tracks = await fetchTracks({ tags: g.tags, orderby: "popularity_total" });
  songs = tracks;
  renderSongs(songs, "songList");
  document.getElementById("songCount").textContent = `${songs.length} songs`;
}

// ── DYNAMIC COLOR THEME ───────────────────
function setDynamicTheme(color) {
  document.getElementById("banner").style.background =
    `linear-gradient(135deg, #1c1506 0%, ${color}22 50%, #160d04 100%)`;
  document.documentElement.style.setProperty("--amber", color);

  // Update glow effects
  const style = document.getElementById("dynamic-style") || (() => {
    const s = document.createElement("style");
    s.id = "dynamic-style";
    document.head.appendChild(s);
    return s;
  })();

  style.textContent = `
    .play-pause { background: ${color} !important; box-shadow: 0 4px 20px ${color}66 !important; color: #111009 !important; }
    .play-pause:hover { background: ${color}ee !important; box-shadow: 0 6px 28px ${color}88 !important; }
    .prog-fill { background: linear-gradient(90deg, ${color}, ${color}bb) !important; }
    .vol-fill  { background: linear-gradient(90deg, ${color}, ${color}bb) !important; }
    .nav-item.active { background: ${color}18 !important; color: ${color} !important; }
    .nav-item.active::before { background: ${color} !important; }
    .song-row.playing { background: ${color}0e !important; border-color: ${color}2a !important; }
    .song-row.playing .song-name { color: ${color} !important; }
    .logo-text { background: linear-gradient(90deg, ${color}, ${color}bb) !important; -webkit-background-clip: text !important; }
    .player::before { background: linear-gradient(90deg, transparent, ${color}, transparent) !important; }
    .btn-primary { background: ${color} !important; box-shadow: 0 4px 20px ${color}55 !important; color: #111009 !important; }
    .upload-btn { background: ${color} !important; color: #111009 !important; }
    .upload-btn-small { background: ${color} !important; color: #111009 !important; }
    .prog-dot { background: ${color} !important; box-shadow: 0 0 8px ${color}cc !important; }
    .row-wave span { background: ${color} !important; }
    .row-play-icon { color: ${color} !important; }
    .like-btn.liked { color: ${color} !important; }
    .song-like-btn.liked { color: ${color} !important; }
    .song-like-btn:hover { color: ${color} !important; }
    .panel-badge { background: ${color} !important; }
    .search-tag { color: ${color} !important; border-color: ${color}30 !important; background: ${color}0e !important; }
    .spinner { border-top-color: ${color} !important; }
    .search-wrap:focus-within { border-color: ${color} !important; box-shadow: 0 0 0 3px ${color}30 !important; }
    .vinyl-label { border-color: ${color}33 !important; }
    .ctrl.active { color: ${color} !important; }
  `;
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
    const dur       = song.duration ? fmtSec(song.duration) : (song.durationStr || "—");
    const cover     = song.album_image || song.cover || "";
    const name      = song.name || song.title || "Unknown";
    const artist    = song.artist_name || song.artist || "Unknown Artist";
    const album     = song.album_name || song.album || "";

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
            : `<div class="song-cover-fallback">🎵</div>`}
        </div>
        <div>
          <div class="song-name">${name}</div>
          <div class="song-album">${album}</div>
        </div>
      </div>
      <div class="song-artist-cell">${artist}</div>
      <div class="song-dur">${dur}</div>
      <div style="display:flex;gap:4px;align-items:center">
        <button class="song-like-btn ${liked ? "liked" : ""}"
                onclick="event.stopPropagation(); toggleSongLike('${song.id}', ${i}, '${containerId}')">
          <i class="${liked ? "fas" : "far"} fa-heart"></i>
        </button>
        <button class="song-like-btn" title="Add to queue"
                onclick="event.stopPropagation(); addToQueue(${i}, '${containerId}')">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>`;
  }).join("");
}

// ── PLAY ──────────────────────────────────
function playSongObj(idx, containerId = "songList") {
  let sourceList = songs;
  if (containerId === "searchResults") sourceList = window._searchSongs || songs;
  if (containerId === "likedList")     sourceList = likedSongs.map(l => l.track);
  if (containerId === "myMusicList")   sourceList = myMusic;
  if (containerId === "recentList")    sourceList = recentlyPlayed.map(r => r.track);

  if (containerId !== "songList") songs = sourceList;

  const song = sourceList[idx];
  if (!song) return;

  const src = song.audio || song.src || "";
  if (!src) { showToast("⚠️ No audio available for this track"); return; }

  curIdx = idx;
  audio.src = src.startsWith("http:") ? src.replace("http:", "https:") : src;
  audio.play().catch(() => showToast("Tap play to start 🎵"));
  playing = true;

  // Dynamic theme from song color
  const songColor = song._color || getCurrentGenreColor();
  setDynamicTheme(songColor);

  updatePlayerBar(song);
  renderSongs(sourceList, containerId);
  document.getElementById("vinyl").classList.add("playing");
  document.getElementById("playPauseBtn").innerHTML = `<i class="fas fa-pause"></i>`;

  // Add to recently played
  addToRecent(song);

  // Update queue display
  renderQueue();
}

function getCurrentGenreColor() {
  const g = genres.find(x => x.id === curGenre);
  return g ? g.color : "#b94fff";
}

function playAll() { if (songs.length) playSongObj(0); }

// ── PLAYER BAR ────────────────────────────
function updatePlayerBar(song) {
  const name   = song.name   || song.title  || "Unknown";
  const artist = song.artist_name || song.artist || "Unknown";

  document.getElementById("npTitle").textContent   = name;
  document.getElementById("npArtist").textContent  = artist;
  document.getElementById("snpTitle").textContent  = name;
  document.getElementById("snpArtist").textContent = artist;

  const img  = document.getElementById("nowPlayingImg");
  const icon = document.getElementById("nowPlayingIcon");
  const cover = song.album_image || song.cover || "";

  if (cover) {
    img.src = cover; img.style.display = "block"; icon.style.display = "none";
    document.getElementById("snpCover").innerHTML =
      `<img src="${cover}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;"/>`;
  } else {
    img.style.display = "none"; icon.style.display = "block";
    document.getElementById("snpCover").innerHTML = `<i class="fas fa-music"></i>`;
  }

  document.getElementById("nowPlayingArt").classList.add("has-song");

  const liked = isLiked(song.id);
  const lb = document.getElementById("likeBtn");
  lb.className = `like-btn ${liked ? "liked" : ""}`;
  lb.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;

  // Song change notification
  showNowPlayingNotif(name, artist, cover);
}

// ── NOW PLAYING NOTIFICATION ──────────────
function showNowPlayingNotif(title, artist, cover) {
  let notif = document.getElementById("now-notif");
  if (!notif) {
    notif = document.createElement("div");
    notif.id = "now-notif";
    notif.className = "now-notif";
    document.body.appendChild(notif);
  }
  notif.innerHTML = `
    <div class="notif-art">${cover ? `<img src="${cover}"/>` : "🎵"}</div>
    <div class="notif-info">
      <p class="notif-title">${title}</p>
      <p class="notif-artist">${artist}</p>
    </div>
    <div class="notif-label">NOW PLAYING</div>`;
  notif.classList.add("show");
  clearTimeout(notif._timer);
  notif._timer = setTimeout(() => notif.classList.remove("show"), 3000);
}

// ── CONTROLS ──────────────────────────────
function togglePlay() {
  if (curIdx === -1) { playAll(); return; }
  if (playing) {
    audio.pause(); playing = false;
    document.getElementById("playPauseBtn").innerHTML = `<i class="fas fa-play"></i>`;
    document.getElementById("vinyl").classList.remove("playing");
    stopVisualizer();
  } else {
    audio.play(); playing = true;
    document.getElementById("playPauseBtn").innerHTML = `<i class="fas fa-pause"></i>`;
    document.getElementById("vinyl").classList.add("playing");
    startVisualizer();
  }
}

function nextSong() {
  if (!songs.length) return;
  // Check queue first
  if (queue.length > 0) {
    const next = queue.shift();
    songs = [next, ...songs];
    curIdx = -1;
    playSongObj(0);
    renderQueue();
    return;
  }
  const next = shuffle
    ? Math.floor(Math.random() * songs.length)
    : (curIdx + 1) % songs.length;
  playSongObj(next);
}
function prevSong() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  playSongObj((curIdx - 1 + songs.length) % songs.length);
}

audio.addEventListener("ended", () => { if (!repeat) nextSong(); });

audio.addEventListener("pause", () => stopVisualizer());

function toggleShuffle() {
  shuffle = !shuffle;
  document.getElementById("shuffleBtn").classList.toggle("active", shuffle);
  showToast(shuffle ? "🔀 Shuffle on" : "Shuffle off");
}
function toggleRepeat() {
  repeat = !repeat; audio.loop = repeat;
  document.getElementById("repeatBtn").classList.toggle("active", repeat);
  showToast(repeat ? "🔁 Repeat on" : "Repeat off");
}
function toggleMute() {
  muted = !muted; audio.volume = muted ? 0 : lastVol;
  document.getElementById("muteBtn").innerHTML =
    `<i class="fas fa-volume-${muted ? "xmark" : "high"}"></i>`;
  document.getElementById("volFill").style.width = (muted ? 0 : lastVol * 100) + "%";
}

// ── PROGRESS ──────────────────────────────
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById("progFill").style.width   = pct + "%";
  document.getElementById("progDot").style.left     = pct + "%";
  document.getElementById("curTime").textContent    = fmt(audio.currentTime);
  document.getElementById("durTime").textContent    = fmt(audio.duration);
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
  document.getElementById("muteBtn").innerHTML   = `<i class="fas fa-volume-high"></i>`;
}

// ── LIKE ──────────────────────────────────
function isLiked(id) { return likedSongs.some(l => l.id == id); }
function saveLiked() { localStorage.setItem("tf_liked", JSON.stringify(likedSongs)); }

function toggleLike() {
  if (curIdx === -1 || !songs[curIdx]) return;
  toggleSongLike(songs[curIdx].id, curIdx, "songList");
}
function toggleSongLike(trackId, idx, containerId = "songList") {
  let sourceList = songs;
  if (containerId === "searchResults") sourceList = window._searchSongs || songs;
  if (containerId === "myMusicList")   sourceList = myMusic;

  const song  = sourceList[idx];
  const exist = likedSongs.findIndex(l => l.id == trackId);
  if (exist >= 0) { likedSongs.splice(exist, 1); showToast("Removed from Liked Songs"); }
  else            { likedSongs.push({ id: trackId, track: song }); showToast("❤️ Added to Liked Songs"); }
  saveLiked(); updateLikedCount();

  renderSongs(sourceList, containerId);
  if (currentSection === "library") renderLibrary();
  if (idx === curIdx) {
    const liked = isLiked(trackId);
    const lb = document.getElementById("likeBtn");
    lb.className = `like-btn ${liked ? "liked" : ""}`;
    lb.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
  }
}
function updateLikedCount() {
  const c = likedSongs.length;
  document.getElementById("likedCount").textContent = `${c} song${c !== 1 ? "s" : ""} liked`;
}

// ── QUEUE ─────────────────────────────────
function addToQueue(idx, containerId = "songList") {
  let sourceList = songs;
  if (containerId === "searchResults") sourceList = window._searchSongs || songs;
  if (containerId === "myMusicList")   sourceList = myMusic;
  const song = sourceList[idx];
  if (!song) return;
  queue.push(song);
  renderQueue();
  showToast(`➕ Added "${song.name || song.title}" to queue`);
}

function removeFromQueue(i) {
  queue.splice(i, 1);
  renderQueue();
}

function clearQueue() {
  queue = [];
  renderQueue();
  showToast("Queue cleared");
}

function renderQueue() {
  const el = document.getElementById("queueList");
  if (!el) return;
  document.getElementById("queueCount").textContent = queue.length ? `${queue.length} songs` : "";

  if (!queue.length) {
    el.innerHTML = `<div class="panel-empty"><i class="fas fa-list"></i><p>Queue is empty</p><span>Hit + on any song</span></div>`;
    return;
  }
  el.innerHTML = queue.map((s, i) => {
    const cover = s.album_image || s.cover || "";
    return `
    <div class="queue-item">
      <div class="queue-art">${cover ? `<img src="${cover}"/>` : "🎵"}</div>
      <div class="queue-info">
        <p class="queue-title">${s.name || s.title}</p>
        <p class="queue-artist">${s.artist_name || s.artist}</p>
      </div>
      <button onclick="removeFromQueue(${i})" class="queue-remove"><i class="fas fa-times"></i></button>
    </div>`;
  }).join("");
}

// ── RECENTLY PLAYED ───────────────────────
function addToRecent(song) {
  // Remove if already exists
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
    el.innerHTML = `<div class="panel-empty"><i class="fas fa-clock"></i><p>Nothing yet</p><span>Play some songs!</span></div>`;
    return;
  }

  el.innerHTML = recentlyPlayed.map((r, i) => {
    const s = r.track;
    const cover = s.album_image || s.cover || "";
    const timeAgo = getTimeAgo(r.time);
    return `
    <div class="queue-item" onclick="songs=[${JSON.stringify(s).replace(/"/g,'&quot;')}]; playSongObj(0, 'recentList')" style="cursor:pointer">
      <div class="queue-art">${cover ? `<img src="${cover}"/>` : "🎵"}</div>
      <div class="queue-info">
        <p class="queue-title">${s.name || s.title}</p>
        <p class="queue-artist">${s.artist_name || s.artist} • ${timeAgo}</p>
      </div>
    </div>`;
  }).join("");
}

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)    return "just now";
  if (diff < 3600000)  return Math.floor(diff/60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff/3600000) + "h ago";
  return Math.floor(diff/86400000) + "d ago";
}

// ── AUDIO VISUALIZER ─────────────────────
function setupVisualizer() {
  const canvas = document.getElementById("visualizer-canvas");
  if (!canvas) return;
}


function startVisualizer() {
  const canvas = document.getElementById("visualizer-canvas");
  if (!canvas) return;

  // Only init AudioContext once, and only after user interaction
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
    }
    if (!source) {
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination); // Must connect to speakers!
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    vizActive = true;
    drawVisualizer();
  } catch(e) {
    // Visualizer failed — but audio still works fine, just skip viz
    console.warn("Visualizer skipped:", e.message);
    vizActive = false;
  }
}

function stopVisualizer() {
  vizActive = false;
  cancelAnimationFrame(animFrame);
  const canvas = document.getElementById("visualizer-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function drawVisualizer() {
  if (!vizActive) return;
  const canvas = document.getElementById("visualizer-canvas");
  if (!canvas) return;

  const ctx    = canvas.getContext("2d");
  const W      = canvas.width;
  const H      = canvas.height;
  const bufLen = analyser.frequencyBinCount;
  const data   = new Uint8Array(bufLen);

  analyser.getByteFrequencyData(data);
  ctx.clearRect(0, 0, W, H);

  const accent = getComputedStyle(document.documentElement).getPropertyValue("--purple").trim() || "#b94fff";
  const barW   = W / bufLen * 2;
  const gap    = 2;

  for (let i = 0; i < bufLen; i++) {
    const barH  = (data[i] / 255) * H * 0.9;
    const x     = i * (barW + gap);
    const alpha = 0.5 + (data[i] / 255) * 0.5;

    const grad = ctx.createLinearGradient(0, H, 0, H - barH);
    grad.addColorStop(0, accent + "44");
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.globalAlpha = alpha;

    const radius = Math.min(barW / 2, 3);
    ctx.beginPath();
    ctx.roundRect(x, H - barH, barW, barH, [radius, radius, 0, 0]);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  animFrame = requestAnimationFrame(drawVisualizer);
}

// ── MY OWN MUSIC UPLOAD ───────────────────
function setupUpload() {
  const input = document.getElementById("musicUpload");
  if (!input) return;

  input.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (!file.type.startsWith("audio/")) continue;

      const url  = URL.createObjectURL(file);
      const name = file.name.replace(/\.[^.]+$/, "");
      const parts = name.split(" - ");
      const title  = parts.length > 1 ? parts[1].trim() : name;
      const artist = parts.length > 1 ? parts[0].trim() : "My Music";

      // Get duration
      const dur = await getAudioDuration(url);

      const track = {
        id:         "local_" + Date.now() + Math.random(),
        name:       title,
        title:      title,
        artist_name: artist,
        artist:     artist,
        album_name: "My Uploads",
        album:      "My Uploads",
        audio:      url,
        src:        url,
        cover:      "",
        album_image: "",
        duration:   Math.floor(dur),
        durationStr: fmtSec(Math.floor(dur)),
        _isLocal:   true,
        _color:     "#b94fff",
      };

      // Avoid duplicates by name
      if (!myMusic.some(m => m.name === track.name)) {
        myMusic.push(track);
      }
    }

    // Save to localStorage (without blob URLs — they don't persist)
    const saveable = myMusic.filter(m => !m._isLocal).map(m => m);
    localStorage.setItem("tf_mymusic", JSON.stringify(saveable));

    renderMyMusic();
    showToast(`✅ ${files.length} song${files.length>1?"s":""} uploaded!`);
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
          <i class="fas fa-cloud-arrow-up"></i> Upload Your Music
        </label>
        <p>Supports MP3, WAV, OGG • Name files as "Artist - Title.mp3" for best results</p>
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
    <div class="song-table-header">
      <span>#</span><span>TITLE</span><span>ARTIST</span>
      <span><i class="fas fa-clock"></i></span><span></span>
    </div>` +
    myMusic.map((song, i) => `
    <div class="song-row" onclick="songs=myMusic; playSongObj(${i}, 'myMusicList')">
      <div class="song-num-wrap">
        <span class="row-num">${i+1}</span>
        <div class="row-play-icon"><i class="fas fa-play"></i></div>
      </div>
      <div class="song-title-cell">
        <div class="song-cover-wrap">
          <div class="song-cover-fallback">🎵</div>
        </div>
        <div>
          <div class="song-name">${song.name}</div>
          <div class="song-album">My Uploads</div>
        </div>
      </div>
      <div class="song-artist-cell">${song.artist_name}</div>
      <div class="song-dur">${song.durationStr || "—"}</div>
      <div style="display:flex;gap:4px">
        <button class="song-like-btn" onclick="event.stopPropagation();addToQueue(${i},'myMusicList')">
          <i class="fas fa-plus"></i>
        </button>
        <button class="song-like-btn" style="color:#ff6b6b;opacity:1"
                onclick="event.stopPropagation();removeMyTrack(${i})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`).join("");
}

function removeMyTrack(i) {
  myMusic.splice(i, 1);
  renderMyMusic();
  showToast("Removed from My Music");
}
function clearMyMusic() {
  myMusic = [];
  localStorage.removeItem("tf_mymusic");
  renderMyMusic();
  showToast("My Music cleared");
}

// ── LIBRARY ───────────────────────────────
function renderLibrary() {
  const el = document.getElementById("likedList");
  if (!el) return;
  if (!likedSongs.length) {
    el.innerHTML = `<div class="empty-library"><div class="empty-icon">💜</div><p>No liked songs yet</p><span>Hit the ♥ on any song</span></div>`;
    return;
  }
  const list = likedSongs.map(l => l.track);
  el.innerHTML = `
    <div class="song-table-header">
      <span>#</span><span>TITLE</span><span>ARTIST</span>
      <span><i class="fas fa-clock"></i></span><span></span>
    </div>` +
    list.map((song, i) => {
      const cover = song.album_image || song.cover || "";
      return `
      <div class="song-row" onclick="songs=window._likedTracks||[]; curIdx=${i}; playSongObj(${i},'likedList')">
        <div class="song-num-wrap"><span class="row-num">${i+1}</span>
          <div class="row-play-icon"><i class="fas fa-play"></i></div></div>
        <div class="song-title-cell">
          <div class="song-cover-wrap">
            ${cover ? `<img src="${cover}" class="song-cover-img"/>` : `<div class="song-cover-fallback">🎵</div>`}
          </div>
          <div><div class="song-name">${song.name||song.title}</div>
          <div class="song-album">${song.album_name||""}</div></div>
        </div>
        <div class="song-artist-cell">${song.artist_name||song.artist}</div>
        <div class="song-dur">${fmtSec(song.duration)}</div>
        <button class="song-like-btn liked"
                onclick="event.stopPropagation();likedSongs.splice(${i},1);saveLiked();renderLibrary();updateLikedCount()">
          <i class="fas fa-heart"></i></button>
      </div>`;
    }).join("");
  window._likedTracks = list;
}

// ── SEARCH ────────────────────────────────
function bindSearch() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClear");

  input.addEventListener("input", e => {
    const q = e.target.value.trim();
    clearBtn.classList.toggle("visible", q.length > 0);
    clearTimeout(searchTimer);
    if (!q) { showSection("home"); return; }
    showSection("search");
    document.getElementById("searchResults").innerHTML =
      `<div class="loading-state"><div class="spinner"></div><p>Searching Jamendo...</p></div>`;
    searchTimer = setTimeout(() => doSearch(q), 500);
  });
  input.addEventListener("keydown", e => { if (e.key === "Escape") clearSearch(); });
}

async function doSearch(query) {
  const tracks = await fetchTracks({ namesearch: query, orderby: "popularity_total" });
  window._searchSongs = tracks;
  const el = document.getElementById("searchResults");
  if (!tracks.length) {
    el.innerHTML = `<div class="search-empty"><div style="font-size:2.5rem;margin-bottom:12px">🔍</div><p>No results for "<strong>${query}</strong>"</p></div>`;
    return;
  }
  el.innerHTML = `<div class="search-tag">${tracks.length} RESULTS FROM JAMENDO</div>
    <div class="song-table-header"><span>#</span><span>TITLE</span><span>ARTIST</span><span><i class="fas fa-clock"></i></span><span></span></div>` +
    tracks.map((song, i) => {
      const liked = isLiked(song.id);
      return `
      <div class="song-row" onclick="songs=window._searchSongs; playSongObj(${i},'searchResults')">
        <div class="song-num-wrap"><span class="row-num">${i+1}</span>
          <div class="row-play-icon"><i class="fas fa-play"></i></div></div>
        <div class="song-title-cell">
          <div class="song-cover-wrap">
            ${song.album_image ? `<img src="${song.album_image}" class="song-cover-img"/>` : `<div class="song-cover-fallback">🎵</div>`}
          </div>
          <div><div class="song-name">${song.name}</div><div class="song-album">${song.album_name||""}</div></div>
        </div>
        <div class="song-artist-cell">${song.artist_name}</div>
        <div class="song-dur">${fmtSec(song.duration)}</div>
        <div style="display:flex;gap:4px">
          <button class="song-like-btn ${liked?"liked":""}"
                  onclick="event.stopPropagation();songs=window._searchSongs;toggleSongLike('${song.id}',${i},'searchResults')">
            <i class="${liked?"fas":"far"} fa-heart"></i></button>
          <button class="song-like-btn" onclick="event.stopPropagation();songs=window._searchSongs;addToQueue(${i},'searchResults')">
            <i class="fas fa-plus"></i></button>
        </div>
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
  document.getElementById("genreCards").innerHTML = genres.map(g => `
    <div class="pl-card" onclick="loadGenre('${g.id}', null)">
      <div class="pl-card-art" style="background:${g.color}22;font-size:3rem">${g.emoji}</div>
      <div class="pl-card-name">${g.label}</div>
      <div class="pl-card-count">Powered by Jamendo</div>
    </div>`).join("");
}

// ── PANELS (queue / recent) ───────────────
function togglePanel(name) {
  const panel = document.getElementById(`panel-${name}`);
  const isOpen = panel.classList.contains("open");
  document.querySelectorAll(".side-panel").forEach(p => p.classList.remove("open"));
  if (!isOpen) panel.classList.add("open");
}

// ── SECTION SWITCH ────────────────────────
function showSection(name) {
  currentSection = name;
  ["home","search","library","mymusic"].forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = s === name ? "block" : "none";
  });
  ["nav-home","nav-search","nav-library","nav-mymusic"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", ["home","search","library","mymusic"][i] === name);
  });
  if (name === "library") { renderLibrary(); updateLikedCount(); }
  if (name === "mymusic") renderMyMusic();
}

// ── UTILS ─────────────────────────────────
function showLoading() {
  document.getElementById("songList").innerHTML =
    `<div class="loading-state"><div class="spinner"></div><p>Loading from Jamendo...</p></div>`;
}
function fmt(s) {
  if (isNaN(s)) return "0:00";
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
}
function fmtSec(s) {
  if (!s) return "—";
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
}

let toastTimer;
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    t.style.cssText = `position:fixed;bottom:110px;left:50%;transform:translateX(-50%);
      background:#1c1c35;border:1px solid rgba(185,79,255,0.3);color:#f0eeff;
      padding:10px 22px;border-radius:50px;font-size:0.85rem;z-index:9999;
      transition:opacity 0.3s;font-family:'Plus Jakarta Sans',sans-serif;
      white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,0.4);`;
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 2500);
}

// ── START ─────────────────────────────────
init();
