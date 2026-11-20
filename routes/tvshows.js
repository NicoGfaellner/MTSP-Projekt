const express = require('express');
const tvShowIds = require('../data/tvshowIDs.js');

const router = express.Router();

const tvShowCache = { tvShows: [], expiresAt: 0 };
let loadingTvShows = null;

async function loadTvShows(apiKey) {
  const results = await Promise.allSettled(tvShowIds.map(async (id) => {
    const url = new URL(`https://api.themoviedb.org/3/tv/${id}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'de-DE');

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(`TMDB HTTP ${response.status} bei Serie ${id}`);
    }

    return response.json();
  }));

  const tvShows = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  const cacheTimeMs = tvShows.length === tvShowIds.length ? 10 * 60_000 : 30_000;
  tvShowCache.tvShows = tvShows;
  tvShowCache.expiresAt = Date.now() + cacheTimeMs;
}

router.get('/', async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    console.error('TMDB_API_KEY fehlt.');
    return res.status(500).render('tvshows', { tvShows: [] });
  }

  if (Date.now() >= tvShowCache.expiresAt) {
    loadingTvShows ??= loadTvShows(apiKey).finally(() => {
      loadingTvShows = null;
    });
    await loadingTvShows;
  }

  const status = tvShowCache.tvShows.length > 0 ? 200 : 502;
  res.status(status).render('tvshows', { tvShows: tvShowCache.tvShows });
});

module.exports = router;
