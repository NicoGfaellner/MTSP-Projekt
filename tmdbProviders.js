const providerCategories = ['flatrate', 'free', 'ads', 'rent', 'buy'];
const providerSearchUrls = new Map([
  // Netflix nutzt keine Titel-Slugs unter /at/, sondern eine Suchroute.
  [8, title => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`],
  [9, title => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`],
  [10, title => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`],
  [613, title => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`],
  [2100, title => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`],
  [1825, title => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`],
  [2578, title => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`],
  [337, title => `https://www.disneyplus.com/de-at/search?q=${encodeURIComponent(title)}`],
  [2, title => `https://tv.apple.com/at/search?term=${encodeURIComponent(title)}`]
]);

function getProviderUrl(providerId, fallbackUrl, title) {
  const searchUrl = providerSearchUrls.get(providerId);
  if (searchUrl && title) return searchUrl(title);

  // TMDB liefert für die übrigen Anbieter keine eigene Titel-URL, sondern
  // einen Link zur Verfügbarkeitsseite dieses konkreten Films bzw. dieser Serie.
  return fallbackUrl || `https://www.themoviedb.org/search?query=${encodeURIComponent(title || '')}`;
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
          regionProviders.link,
          details.title || details.name
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
