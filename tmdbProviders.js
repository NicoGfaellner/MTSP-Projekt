const providerCategories = ['flatrate', 'free', 'ads', 'rent', 'buy'];

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

module.exports = { fetchTitleWithProviders };
