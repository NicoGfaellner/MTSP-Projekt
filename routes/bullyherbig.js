const express = require('express');
const movieIds = require('../data/bullyHerbigMovieIDs');
const { fetchTitleWithProviders } = require('../tmdbProviders');

const router = express.Router();
const movieCache = { movies: [], expiresAt: 0 };
let loadingMovies = null;

async function loadMovies(apiKey) {
  const results = await Promise.allSettled(
    movieIds.map(id => fetchTitleWithProviders('movie', id, apiKey))
  );

  movieCache.movies = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
  movieCache.expiresAt = Date.now() + (movieCache.movies.length === movieIds.length ? 10 : 1) * 60_000;
}

router.get('/', async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY;

  if (movieIds.length > 0 && !apiKey) {
    console.error('TMDB_API_KEY fehlt.');
    return res.status(500).render('bullyherbig', {
      movies: [],
      hasIds: true,
      loadError: true
    });
  }

  if (movieIds.length > 0 && Date.now() >= movieCache.expiresAt) {
    loadingMovies ??= loadMovies(apiKey).finally(() => {
      loadingMovies = null;
    });
    await loadingMovies;
  }

  const loadError = movieIds.length > 0 && movieCache.movies.length === 0;
  res.status(loadError ? 502 : 200).render('bullyherbig', {
    movies: movieCache.movies,
    hasIds: movieIds.length > 0,
    loadError
  });
});

module.exports = router;
