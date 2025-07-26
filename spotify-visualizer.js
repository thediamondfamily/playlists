const clientId = "93d0e1b0641043049a3aa12f8f133bfa";
const redirectUri = window.location.origin + "/";
const scopes = "playlist-read-private playlist-read-collaborative";
const targetUserId = "315ryhmeb2p2tz44k3zwlevnb3vi";

let accessToken = null;

function login() {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`;
  window.location.href = authUrl;
}

function getAccessTokenFromUrl() {
  const hash = window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash.substring(1));
  return params.get("access_token");
}

async function fetchWithToken(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.json();
}

async function loadPlaylists() {
  const data = await fetchWithToken(`https://api.spotify.com/v1/users/${targetUserId}/playlists?limit=50`);
  const select = document.getElementById("playlists");
  select.innerHTML = ""; // Clear old options

  document.getElementById("username").textContent = targetUserId;

  data.items.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  if (data.items.length > 0) {
    loadPlaylist(data.items[0].id);
  }
}

async function loadPlaylist(playlistId) {
  const tracksDiv = document.getElementById("tracks");
  tracksDiv.innerHTML = "";
  const data = await fetchWithToken(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`);
  let totalMs = 0;
  const genres = {};

  for (let item of data.items) {
    const track = item.track;
    if (!track) continue;

    totalMs += track.duration_ms;

    // Try to get genres
    try {
      const artistData = await fetchWithToken(track.artists[0].href);
      for (let genre of artistData.genres) {
        genres[genre] = (genres[genre] || 0) + 1;
      }
    } catch (e) {
      console.warn("Couldn't get artist genres for", track.name);
    }

    const trackEl = document.createElement("div");
    trackEl.className = "track";
    trackEl.innerHTML = `<img src="${track.album.images[2]?.url}" alt=""> ${track.name} – ${track.artists[0].name}`;
    tracksDiv.appendChild(trackEl);
  }

  document.getElementById("duration").textContent = msToTime(totalMs);
  drawGenreChart(genres);
}

function msToTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins} min ${secs} sec`;
}

function drawGenreChart(genreData) {
  const ctx = document.getElementById("genreChart").getContext("2d");
  const labels = Object.keys(genreData);
  const values = Object.values(genreData);
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map(() => `hsl(${Math.random()*360}, 70%, 60%)`)
      }]
    }
  });
}

// Boot
window.onload = () => {
  accessToken = getAccessTokenFromUrl();
  if (!accessToken) {
    document.getElementById("login").style.display = "block";
  } else {
    document.getElementById("app").style.display = "block";
    loadPlaylists();
  }
};
