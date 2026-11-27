const express = require('express');
const movieIds = require('../data/movieIDs.js');
const { fetchTitleWithProviders } = require('../tmdbProviders');

const router = express.Router();

const movieCache = { movies: [], expiresAt: 0 };
let loadingMovies = null;

async function loadMovies(apiKey) {
  const results = await Promise.allSettled(
    movieIds.map(id => fetchTitleWithProviders('movie', id, apiKey))
  );

  const movies = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  const cacheTimeMs = movies.length === movieIds.length ? 10 * 60_000 : 30_000;
  movieCache.movies = movies;
  movieCache.expiresAt = Date.now() + cacheTimeMs;
}

// Filmübersicht
router.get('/', async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY;
  const moviesPath = req.baseUrl;

  if (!apiKey) {
    console.error('TMDB_API_KEY fehlt.');
    return res.status(500).render('movies', { movies: [], moviesPath });
  }

  if (Date.now() >= movieCache.expiresAt) {
    loadingMovies ??= loadMovies(apiKey).finally(() => {
      loadingMovies = null;
    });
    await loadingMovies;
  }

  const status = movieCache.movies.length > 0 ? 200 : 502;
  res.status(status).render('movies', { movies: movieCache.movies, moviesPath });
});

// Detailseite für einen Film
router.get('/:id', async (req, res) => {
  const moviesPath = req.baseUrl;
  const movieId = Number(req.params.id);

  const renderError = status => res.status(status).render('movie-details', {
    movie: null,
    moviesPath,
    message: status === 404
      ? 'Film nicht gefunden.'
      : 'Der Film konnte gerade nicht geladen werden.'
  });

  if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(movieId)) {
    return renderError(404);
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY fehlt.');
    return renderError(500);
  }

  let movie;
  try {
    if (Date.now() < movieCache.expiresAt) {
      movie = movieCache.movies.find(entry => entry.id === movieId);
    }

    movie ??= await fetchTitleWithProviders('movie', movieId, apiKey);
  } catch (error) {
    return renderError(error.status === 404 ? 404 : 502);
  }

  res.render('movie-details', { movie, moviesPath });
});

module.exports = router;