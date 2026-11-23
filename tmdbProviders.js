const providerCategories = ['flatrate', 'free', 'ads', 'rent', 'buy'];
const primeVideoSearch = title => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`;
const providerSearchUrls = new Map([
  // Netflix verwendet eine Suchroute, keinen /at/Titel-Slug.
  [8, title => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`],
  [9, primeVideoSearch], // Amazon Prime Video
  [10, primeVideoSearch], // Amazon Video
  [119, primeVideoSearch], // ältere TMDB-ID für Amazon Prime Video
  [20, title => `https://www.maxdome.de/search?query=${encodeURIComponent(title)}`],
  [29, title => `https://www.sky.at/suche?query=${encodeURIComponent(title)}`],
  [30, title => `https://www.wowtv.de/suche?query=${encodeURIComponent(title)}`],
  [35, title => `https://www.rakuten.tv/at/search?query=${encodeURIComponent(title)}`],
  [2, title => `https://tv.apple.com/at/search?term=${encodeURIComponent(title)}`],
  [130, title => `https://www.sky.at/suche?query=${encodeURIComponent(title)}`],
  [304, title => `https://www.joyn.at/suche?q=${encodeURIComponent(title)}`],
  [350, title => `https://tv.apple.com/at/search?term=${encodeURIComponent(title)}`],
  [421, title => `https://www.joyn.at/suche?q=${encodeURIComponent(title)}`],
  [337, title => `https://www.disneyplus.com/de-at/search?q=${encodeURIComponent(title)}`],
  [531, title => `https://www.paramountplus.com/search/?q=${encodeURIComponent(title)}`],
  [582, primeVideoSearch],
  [613, primeVideoSearch],
  [678, primeVideoSearch],
  [533, primeVideoSearch],
  [1806, primeVideoSearch],
  [1825, primeVideoSearch],
  [1856, title => `https://tv.magenta.at/?q=${encodeURIComponent(title)}`],
  [1898, primeVideoSearch],
  [1899, title => `https://www.hbomax.com/at/de/search?q=${encodeURIComponent(title)}`],
  [2100, primeVideoSearch],
  [2258, primeVideoSearch],
  [2288, primeVideoSearch],
  [2293, primeVideoSearch],
  [2578, primeVideoSearch],
  [2745, primeVideoSearch],
  [2750, title => `https://plus.rtl.de/suche?query=${encodeURIComponent(title)}`],
  [2784, title => `https://www.justwatch.com/at/search?q=${encodeURIComponent(title)}`]
]);

function getProviderUrl(providerId, title, providerName) {
  const searchUrl = providerSearchUrls.get(providerId);
  if (searchUrl && title) return searchUrl(title);

  // Amazon-Channel-Anbieter nutzen die Suche des Amazon-Prime-Video-Katalogs.
  if (providerName?.toLowerCase().includes('amazon')) {
    return primeVideoSearch(title || providerName);
  }

  // Nie auf TMDB zurückfallen: unbekannte Anbieter erhalten eine eigene Suche.
  return `https://www.google.com/search?q=${encodeURIComponent(`${providerName || ''} ${title || ''}`.trim())}`;
}

async function fetchTitleWithProviders(type, id, apiKey) {
  const detailsUrl = new URL(`https://api.themoviedb.org/3/${type}/${id}`);
  const providersUrl = new URL(`https://api.themoviedb.org/3/${type}/${id}/watch/providers`);

  detailsUrl.searchParams.set('api_key', apiKey);
  detailsUrl.searchParams.set('language', 'de-DE');
  providersUrl.searchParams.set('api_key', apiKey);

  const [detailsResponse, providersResponse] = await Promise.all([
    fetch(detailsUrl, { signal: AbortSignal.timeout(5000) }),
    fetch(providersUrl, { signal: AbortSignal.timeout(5000) })
  ]);

  if (!detailsResponse.ok || !providersResponse.ok) {
    throw new Error(`TMDB-Daten konnten für ${type} ${id} nicht geladen werden`);
  }

  const details = await detailsResponse.json();
  const providers = await providersResponse.json();
  const regionProviders = providers.results?.AT || {};
  const uniqueProviders = new Map();

  for (const category of providerCategories) {
    for (const provider of regionProviders[category] || []) {
      uniqueProviders.set(provider.provider_id, {
        id: provider.provider_id,
        name: provider.provider_name,
        url: getProviderUrl(
          provider.provider_id,
          details.title || details.name,
          provider.provider_name
        ),
        logoUrl: provider.logo_path
          ? `https://image.tmdb.org/t/p/w92${provider.logo_path}`
          : null
      });
    }
  }

  return {
    ...details,
    streamingProviders: [...uniqueProviders.values()]
      .filter(provider => provider.logoUrl)
  };
}

module.exports = { fetchTitleWithProviders, getProviderUrl };
