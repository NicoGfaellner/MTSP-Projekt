const express = require('express');
const movieIds = require('../data/movieIDs.js');

const router = express.Router();

const movieCache = { movies: [], expiresAt: 0 };
let loadingMovies = null;

async function loadMovies(apiKey) {
  const results = await Promise.allSettled(movieIds.map(async (id) => {
    const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'de-DE');

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(`TMDB HTTP ${response.status} bei Film ${id}`);
    }

    return response.json();
  }));

  const movies = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  const cacheTimeMs = movies.length === movieIds.length ? 10 * 60_000 : 30_000;
  movieCache.movies = movies;
  movieCache.expiresAt = Date.now() + cacheTimeMs;
}

router.get('/', async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    console.error('TMDB_API_KEY fehlt.');
    return res.status(500).render('movies', { movies: [] });
  }

  if (Date.now() >= movieCache.expiresAt) {
    loadingMovies ??= loadMovies(apiKey).finally(() => {
      loadingMovies = null;
    });
    await loadingMovies;
  }

  const status = movieCache.movies.length > 0 ? 200 : 502;
  res.status(status).render('movies', { movies: movieCache.movies });
});

module.exports = router;