const slider = document.querySelector('#charges');
const chargeOutput = document.querySelector('#chargeOutput');
const co2Result = document.querySelector('#co2Result');
const creditResult = document.querySelector('#creditResult');
const valueResult = document.querySelector('#valueResult');
const format = new Intl.NumberFormat('pt-BR');

function updateImpact() {
  const charges = Number(slider.value);
  const tonnes = charges * 88 / 1000;
  chargeOutput.value = format.format(charges);
  co2Result.textContent = `${format.format(tonnes)} t`;
  const projectedCredits = Math.floor(charges / 36);
  creditResult.textContent = format.format(projectedCredits);
  valueResult.textContent = (projectedCredits * 23.75).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

slider.addEventListener('input', updateImpact);
updateImpact();

async function refreshMarketQuotes() {
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (!response.ok) return;
    const data = await response.json();
    const usd = Number(data.USDBRL?.bid);
    if (usd) document.querySelector('#usdQuote').textContent = usd.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch (_) {
    // Mantém a última referência visível quando a fonte estiver indisponível.
  }
}
refreshMarketQuotes();
setInterval(refreshMarketQuotes, 300000);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });
document.querySelectorAll('main > section, .steps article, .metrics article').forEach((item) => {
  item.classList.add('reveal');
  revealObserver.observe(item);
});

const mapElement = document.querySelector('#chargingMap');
if (mapElement && window.L) {
  const dfCenter = [-15.7939, -47.8828];
  const map = L.map(mapElement, { scrollWheelZoom: true, dragging: true, touchZoom: true, doubleClickZoom: true, keyboard: true, zoomControl: true }).setView(dfCenter, 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  const layers = { all: L.layerGroup().addTo(map), free: [], paid: [], gdf: [], unknown: [] };
  const status = document.querySelector('#mapStatus');
  const overpassQuery = `[out:json][timeout:30];area["ISO3166-2"="BR-DF"]->.df;(nwr["amenity"="charging_station"](area.df););out center tags;`;

  function categoryFor(tags) {
    const operator = `${tags.operator || ''} ${tags.owner || ''} ${tags.name || ''}`.toLowerCase();
    if (/\bgdf\b|governo do distrito federal|distrito federal/.test(operator)) return 'gdf';
    if (tags.fee === 'no') return 'free';
    if (tags.fee === 'yes') return 'paid';
    return 'unknown';
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  }
  function paint(filter) {
    layers.all.clearLayers();
    Object.entries(layers).forEach(([category, markers]) => {
      if (category !== 'all' && (filter === 'all' || filter === category)) markers.forEach(marker => marker.addTo(layers.all));
    });
  }
  fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`)
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(data => {
      data.elements.forEach(item => {
        const lat = item.lat || item.center?.lat; const lon = item.lon || item.center?.lon;
        if (!lat || !lon) return;
        const tags = item.tags || {}; const category = categoryFor(tags);
        const label = tags.name || tags.operator || 'Eletroposto';
        const fee = category === 'free' ? 'Gratuito' : category === 'paid' ? 'Pago' : category === 'gdf' ? 'GDF / público' : 'Tarifa não informada';
        const marker = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: `<span class="map-pin ${category}">ϟ</span>`, iconSize: [34, 34], iconAnchor: [17, 17] }) });
        marker.bindPopup(`<strong>${escapeHtml(label)}</strong><br>${escapeHtml(fee)}${tags.opening_hours ? `<br>${escapeHtml(tags.opening_hours)}` : ''}`);
        layers[category].push(marker);
      });
      paint('all');
      const total = layers.free.length + layers.paid.length + layers.gdf.length + layers.unknown.length;
      document.querySelector('#countAll').textContent = total; document.querySelector('#countFree').textContent = layers.free.length; document.querySelector('#countPaid').textContent = layers.paid.length; document.querySelector('#countGdf').textContent = layers.gdf.length;
      status.textContent = `${total} pontos encontrados na base pública.`;
    })
    .catch(() => { status.textContent = 'Não foi possível atualizar a base agora. Tente novamente mais tarde.'; });
  document.querySelectorAll('.map-filters button').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.map-filters button').forEach(item => item.classList.remove('active')); button.classList.add('active'); paint(button.dataset.filter);
  }));
  document.querySelector('#resetMap')?.addEventListener('click', () => map.flyTo(dfCenter, 10, { duration: 1.1 }));
  new ResizeObserver(() => map.invalidateSize()).observe(mapElement);
} else if (mapElement) {
  mapElement.innerHTML = '<iframe title="Mapa interativo do Distrito Federal" src="https://www.openstreetmap.org/export/embed.html?bbox=-48.285%2C-16.075%2C-47.30%2C-15.45&amp;layer=mapnik" loading="lazy"></iframe>';
  const status = document.querySelector('#mapStatus');
  if (status) status.textContent = 'Mapa básico carregado. A lista de eletropostos estará disponível quando a conexão for restabelecida.';
}
