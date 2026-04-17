const form = document.getElementById('city-form');
const input = document.getElementById('city-input');
const message = document.getElementById('message');
const weatherCard = document.getElementById('weather-card');
const cityLabel = document.getElementById('weather-city');
const descriptionLabel = document.getElementById('weather-description');
const tempLabel = document.getElementById('weather-temp');
const windLabel = document.getElementById('weather-wind');
const windDirLabel = document.getElementById('weather-wind-dir');
const timeLabel = document.getElementById('weather-time');

const weatherCodes = {
  0: 'Cielo despejado',
  1: 'Principalmente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Neblina con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna densa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  80: 'Chubascos leves',
  81: 'Chubascos moderados',
  82: 'Chubascos fuertes',
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const city = input.value.trim();

  if (!city) {
    showMessage('Por favor ingresa el nombre de una ciudad.');
    return;
  }

  showMessage('Buscando clima...');
  weatherCard.classList.add('hidden');

  try {
    const location = await fetchLocation(city);
    if (!location) {
      showMessage('No se encontró la ciudad. Intenta con otro nombre.');
      return;
    }

    const weather = await fetchWeather(location.latitude, location.longitude);
    renderWeather(location.name, location.country, weather);
  } catch (error) {
    console.error(error);
    showMessage('Ocurrió un error al obtener el clima. Intenta de nuevo.');
  }
});

async function fetchLocation(city) {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es`);
  const data = await getJsonOrThrow(response, 'Geocoding');
  return data.results && data.results.length > 0 ? data.results[0] : null;
}

/**
 * Obtiene los datos del clima actual para una ubicación específica utilizando la API de Open-Meteo.
 *
 * Esta función realiza una solicitud HTTP a la API de pronóstico de Open-Meteo para recuperar
 * información meteorológica actual basada en las coordenadas de latitud y longitud proporcionadas.
 * La respuesta incluye datos como temperatura, velocidad del viento, dirección del viento y código
 * del clima, entre otros.
 *
 * @param {number} latitude - La latitud de la ubicación en grados decimales (ej. 40.4168 para Madrid).
 * @param {number} longitude - La longitud de la ubicación en grados decimales (ej. -3.7038 para Madrid).
 * @returns {Promise<Object>} Una promesa que resuelve a un objeto con los datos del clima actual.
 *   El objeto incluye propiedades como:
 *   - temperature: Número, temperatura en grados Celsius.
 *   - windspeed: Número, velocidad del viento en km/h.
 *   - winddirection: Número, dirección del viento en grados (0-360).
 *   - weathercode: Número, código que representa las condiciones climáticas.
 *   - time: Cadena, timestamp de la medición en formato ISO.
 * @throws {Error} Si la solicitud a la API falla (por ejemplo, error de red o límite de solicitudes excedido).
 *
 * @example
 * // Obtener el clima actual para Madrid
 * fetchWeather(40.4168, -3.7038)
 *   .then(weather => {
 *     console.log(`Temperatura: ${weather.temperature}°C`);
 *     console.log(`Velocidad del viento: ${weather.windspeed} km/h`);
 *   })
 *   .catch(error => {
 *     console.error('Error al obtener el clima:', error.message);
 *   });
 */
function saveWeatherData(latitude, longitude, weatherData) {
  const key = `weather_${latitude}_${longitude}`;
  const dataToStore = {
    weather: weatherData,
    expiresAt: Date.now() + 3600000, // 1 hora en milisegundos
  };
  localStorage.setItem(key, JSON.stringify(dataToStore));
}

/**
 * Obtiene los datos del clima actual para una ubicación específica utilizando la API de Open-Meteo.
 *
 * Esta función realiza una solicitud HTTP a la API de pronóstico de Open-Meteo para recuperar
 * información meteorológica actual basada en las coordenadas de latitud y longitud proporcionadas.
 * La respuesta incluye datos como temperatura, velocidad del viento, dirección del viento y código
 * del clima, entre otros.
 *
 * Los datos se almacenan en localStorage por 1 hora para evitar llamadas innecesarias a la API.
 * Si hay datos válidos en localStorage, se utilizan en lugar de hacer una nueva solicitud.
 *
 * @param {number} latitude - La latitud de la ubicación en grados decimales (ej. 40.4168 para Madrid).
 * @param {number} longitude - La longitud de la ubicación en grados decimales (ej. -3.7038 para Madrid).
 * @returns {Promise<Object>} Una promesa que resuelve a un objeto con los datos del clima actual.
 *   El objeto incluye propiedades como:
 *   - temperature: Número, temperatura en grados Celsius.
 *   - windspeed: Número, velocidad del viento en km/h.
 *   - winddirection: Número, dirección del viento en grados (0-360).
 *   - weathercode: Número, código que representa las condiciones climáticas.
 *   - time: Cadena, timestamp de la medición en formato ISO.
 * @throws {Error} Si la solicitud a la API falla (por ejemplo, error de red o límite de solicitudes excedido).
 *
 * @example
 * // Obtener el clima actual para Madrid
 * fetchWeather(40.4168, -3.7038)
 *   .then(weather => {
 *     console.log(`Temperatura: ${weather.temperature}°C`);
 *     console.log(`Velocidad del viento: ${weather.windspeed} km/h`);
 *   })
 *   .catch(error => {
 *     console.error('Error al obtener el clima:', error.message);
 *   });
 */
async function fetchWeather(latitude, longitude) {
  const key = `weather_${latitude}_${longitude}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Date.now() < parsed.expiresAt) {
      return parsed.weather;
    } else {
      localStorage.removeItem(key); // Limpiar datos expirados
    }
  }

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
  const data = await getJsonOrThrow(response, 'Weather');
  const weather = data.current_weather;
  saveWeatherData(latitude, longitude, weather);
  return weather;
}

function renderWeather(cityName, country, weather) {
  const description = weatherCodes[weather.weathercode] || 'Condiciones desconocidas';
  const time = new Date(weather.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  cityLabel.textContent = `${cityName}, ${country}`;
  descriptionLabel.textContent = description;
  tempLabel.textContent = `${Math.round(weather.temperature)}°C`;
  windLabel.textContent = `${weather.windspeed} km/h`;
  windDirLabel.textContent = getWindDirection(weather.winddirection);
  timeLabel.textContent = time;

  showMessage('');
  weatherCard.classList.remove('hidden');
}

function showMessage(text) {
  message.textContent = text;
}

function getWindDirection(degree) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degree / 45) % 8;
  return directions[index];
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertThrowsAsync(fn, expectedSubstring) {
  let threw = false;
  try {
    await fn();
  } catch (error) {
    threw = true;
    assert(error.message.includes(expectedSubstring), `El error esperado debe contener '${expectedSubstring}', pero fue '${error.message}'.`);
  }
  assert(threw, `Se esperaba que la función lanzara un error con '${expectedSubstring}'.`);
}

function createResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? 'Too Many Requests' : 'Error',
    async json() {
      return body;
    },
  };
}

function withMockFetch(mockFetch) {
  const originalFetch = window.fetch;
  window.fetch = mockFetch;
  return () => {
    window.fetch = originalFetch;
  };
}

async function getJsonOrThrow(response, apiName) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const details = data && data.error ? `: ${data.error}` : ` ${response.statusText}`;
    throw new Error(`${apiName} API error ${response.status}${details}`);
  }
  return data;
}

function logTestResult(name, passed, info) {
  const status = passed ? '✅' : '❌';
  const details = info ? ` - ${info}` : '';
  console[name.startsWith('fetch') ? 'log' : 'log'](`${status} ${name}${details}`);
}

async function testFetchLocation() {
  const city = 'Madrid';
  const location = await fetchLocation(city);

  assert(location, `La ciudad '${city}' no se encontró.`);
  assert(typeof location.latitude === 'number', 'latitude debe ser un número.');
  assert(typeof location.longitude === 'number', 'longitude debe ser un número.');
  assert(location.name && location.country, 'El resultado debe incluir nombre y país.');

  return location;
}

async function testFetchWeather() {
  const location = await testFetchLocation();
  const weather = await fetchWeather(location.latitude, location.longitude);

  assert(weather, 'No se recibió un objeto weather.');
  assert(typeof weather.temperature === 'number', 'temperature debe ser un número.');
  assert(typeof weather.windspeed === 'number', 'windspeed debe ser un número.');
  assert(typeof weather.winddirection === 'number', 'winddirection debe ser un número.');
  assert(typeof weather.weathercode === 'number', 'weathercode debe ser un número.');
  assert(typeof weather.time === 'string', 'time debe ser una cadena.');

  return weather;
}

async function testEndToEndSearch() {
  const city = 'Barcelona';
  const location = await fetchLocation(city);
  const weather = await fetchWeather(location.latitude, location.longitude);

  assert(location.name.toLowerCase().includes(city.toLowerCase()), `La ciudad obtenida debe corresponder a '${city}'.`);
  assert(weather.temperature !== undefined, 'Debe recuperarse la temperatura.');

  return { location, weather };
}

async function testInvalidCityEdgeCase() {
  const restore = withMockFetch(async () => createResponse(200, { results: [] }));
  try {
    const location = await fetchLocation('CiudadInexistente');
    assert(location === null, 'Debe devolver null cuando no hay resultados de geocodificación.');
  } finally {
    restore();
  }
}

async function testRateLimitLocationEdgeCase() {
  const restore = withMockFetch(async () => createResponse(429, { error: 'Rate limit exceeded' }));
  try {
    await assertThrowsAsync(() => fetchLocation('Madrid'), 'Geocoding API error 429');
  } finally {
    restore();
  }
}

async function testRateLimitWeatherEdgeCase() {
  const restore = withMockFetch(async () => createResponse(429, { error: 'Rate limit exceeded' }));
  try {
    await assertThrowsAsync(() => fetchWeather(40.4168, -3.7038), 'Weather API error 429');
  } finally {
    restore();
  }
}

async function runBrowserTests() {
  const tests = [
    { name: 'fetchLocation obtiene coordenadas', fn: testFetchLocation },
    { name: 'fetchWeather obtiene datos de clima', fn: testFetchWeather },
    { name: 'Busqueda de ciudad de extremo a extremo', fn: testEndToEndSearch },
    { name: 'Edge case: ciudad no existe', fn: testInvalidCityEdgeCase },
    { name: 'Edge case: límite de solicitudes en geocodificación', fn: testRateLimitLocationEdgeCase },
    { name: 'Edge case: límite de solicitudes en clima', fn: testRateLimitWeatherEdgeCase },
  ];

  console.group('Pruebas de la app de clima');
  for (const test of tests) {
    try {
      await test.fn();
      logTestResult(test.name, true);
    } catch (error) {
      logTestResult(test.name, false, error.message);
    }
  }
  console.groupEnd();
}

runBrowserTests();

