const API_KEY  = '3ff9366cfdd43a71a910c0dd9a28c4fc';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const UNITS    = 'metric';
const LS_KEY   = 'wdb_search_history';

// DOM elements
const cityInput       = document.getElementById('city-input');
const searchBtn       = document.getElementById('search-btn');
const errorMsg        = document.getElementById('error-msg');
const errorText       = document.getElementById('error-text');
const loader          = document.getElementById('loader');
const currentSection  = document.getElementById('current-weather');
const forecastSection = document.getElementById('forecast-section');
const forecastCards   = document.getElementById('forecast-cards');
const historySection  = document.getElementById('history-section');
const historyList     = document.getElementById('history-list');
const clearHistBtn    = document.getElementById('clear-history-btn');

const cwCity          = document.getElementById('cw-city');
const cwDate          = document.getElementById('cw-date');
const cwDesc          = document.getElementById('cw-desc');
const cwIcon          = document.getElementById('cw-icon');
const cwTemp          = document.getElementById('cw-temp');
const cwHumidity      = document.getElementById('cw-humidity');
const cwWind          = document.getElementById('cw-wind');
const cwFeels         = document.getElementById('cw-feels');
const cwVis           = document.getElementById('cw-visibility');

// Event listeners
searchBtn.addEventListener('click', handleSearch);

// Enter key triggers search
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

clearHistBtn.addEventListener('click', clearHistory);

// Restore history on load
renderHistory();

// Starfield animation
initStarfield();

function handleSearch() {
  const city = cityInput.value.trim();

  if (!city) {
    showError('Please enter a city name before searching.');
    return;
  }

  hideError();
  fetchWeather(city);
}

async function fetchWeather(city) {
  showLoader(true);
  hideSections();

  try {
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${UNITS}&appid=${API_KEY}`;
    const res  = await fetch(url);

    if (!res.ok) {
      if (res.status === 404) {
        showError('City not found. Please try again.');
      } else if (res.status === 401) {
        showError('Invalid API key. Please check your configuration.');
      } else {
        showError(`Something went wrong (HTTP ${res.status}). Please try again.`);
      }
      showLoader(false);
      return;
    }

    const data = await res.json();

    renderCurrentWeather(data);
    await fetchForecast(city);
    saveToHistory(city);

  } catch (err) {
    showError('Network error. Please check your internet connection.');
    console.error('fetchWeather error:', err);
  } finally {
    showLoader(false);
  }
}

function renderCurrentWeather(data) {
  cwCity.textContent = `${data.name}, ${data.sys.country}`;
  cwDate.textContent = formatDate(new Date());
  cwDesc.textContent = data.weather[0].description;
  cwTemp.textContent = Math.round(data.main.temp);

  const iconCode = data.weather[0].icon;
  cwIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  cwIcon.alt = data.weather[0].description;

  // Stats
  cwHumidity.textContent = `${data.main.humidity}%`;
  cwWind.textContent     = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
  cwFeels.textContent    = `${Math.round(data.main.feels_like)}°C`;
  cwVis.textContent      = `${(data.visibility / 1000).toFixed(1)} km`;

  currentSection.style.display = 'block';
}

async function fetchForecast(city) {
  const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=${UNITS}&appid=${API_KEY}`;
  const res  = await fetch(url);

  if (!res.ok) return;

  const data = await res.json();

  const today    = new Date().toDateString();
  const dailyMap = {};

  data.list.forEach(item => {
    const date    = new Date(item.dt * 1000);
    const dateStr = date.toDateString();

    if (dateStr === today) return;

    const hour = date.getHours();

    // Keep entry closest to noon
    if (
      !dailyMap[dateStr] ||
      Math.abs(hour - 12) < Math.abs(new Date(dailyMap[dateStr].dt * 1000).getHours() - 12)
    ) {
      dailyMap[dateStr] = item;
    }
  });

  const forecastDays = Object.values(dailyMap).slice(0, 5);

  renderForecast(forecastDays);
}

function renderForecast(days) {
  forecastCards.innerHTML = '';

  days.forEach(day => {
    const date     = new Date(day.dt * 1000);
    const iconCode = day.weather[0].icon;
    const desc     = day.weather[0].description;
    const temp     = Math.round(day.main.temp);
    const humidity = day.main.humidity;

    const card = document.createElement('div');
    card.className = 'forecast-card';

    card.innerHTML = `
      <div class="fc-day">${formatShortDate(date)}</div>
      <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${desc}"/>
      <div class="fc-temp">${temp}°</div>
      <div class="fc-desc">${desc}</div>
      <div class="fc-humidity">💧 ${humidity}%</div>
    `;

    forecastCards.appendChild(card);
  });

  forecastSection.style.display = 'block';
}

// Search history
function saveToHistory(city) {
  let history = getHistory();

  const normalised = toTitleCase(city);

  history = history.filter(c => c.toLowerCase() !== normalised.toLowerCase());
  history.unshift(normalised);

  if (history.length > 10) history = history.slice(0, 10);

  localStorage.setItem(LS_KEY, JSON.stringify(history));
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historySection.style.display = 'none';
    return;
  }

  historySection.style.display = 'block';

  history.forEach(city => {
    const li = document.createElement('li');
    li.className = 'history-chip';
    li.textContent = city;

    li.addEventListener('click', () => {
      cityInput.value = city;
      fetchWeather(city);
    });

    historyList.appendChild(li);
  });
}

function clearHistory() {
  localStorage.removeItem(LS_KEY);
  renderHistory();
}

// Utilities
function showLoader(show) {
  loader.style.display = show ? 'flex' : 'none';
}

function hideSections() {
  currentSection.style.display  = 'none';
  forecastSection.style.display = 'none';
}

function showError(msg) {
  errorText.textContent  = msg;
  errorMsg.style.display = 'flex';
}

function hideError() {
  errorMsg.style.display = 'none';
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric'
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day:     'numeric',
    month:   'short'
  });
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Animated starfield
function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const stars = [];
  const starCount = 200;

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5,
      speed: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.5 + 0.3
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();

      // Drift down
      star.y += star.speed;

      // Reset to top
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
    });

    requestAnimationFrame(animate);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}
