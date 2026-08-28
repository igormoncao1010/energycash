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
