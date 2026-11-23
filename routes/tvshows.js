const express = require('express');
const tvShowIds = require('../data/tvshowIDs.js');
const { fetchTitleWithProviders } = require('../tmdbProviders');

const router = express.Router();

const tvShowCache = { tvShows: [], expiresAt: 0 };
let loadingTvShows = null;

async function loadTvShows(apiKey) {
  const results = await Promise.allSettled(
    tvShowIds.map(id => fetchTitleWithProviders('tv', id, apiKey))
  );

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
