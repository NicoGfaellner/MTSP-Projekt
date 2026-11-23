//imports
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const requestLogger = require('./middlewares/requestLogger');
const moviesRouter = require('./routes/movies');
const tvShowsRouter = require('./routes/tvshows');
const movieIds = require('./data/movieIDs');
const tvShowIds = require('./data/tvshowIDs');
require('dotenv').config({ path: './api.env' });

//neue Instanz von express erstellen
const server = express();

//statische Dateien
server.use(express.static('./public'));

//Middlewares
server.use(express.urlencoded({ extended: true }));
server.use(requestLogger);

//Template Engine EJS
server.use(expressLayouts);
server.set('layout', './layouts/main');
server.set('view engine', 'ejs');

const homeCache = { movies: [], tvShows: [], expiresAt: 0 };
let loadingHomeContent = null;

async function loadHomeContent(apiKey) {
  const requests = [
    ...movieIds.slice(0, 3).map(id => ({ type: 'movie', id })),
    ...tvShowIds.slice(0, 2).map(id => ({ type: 'tv', id }))
  ];

  const results = await Promise.allSettled(
    requests.map(async ({ type, id }) => {
      const detailsUrl = new URL(
        `https://api.themoviedb.org/3/${type}/${id}`
      );

      const providersUrl = new URL(
        `https://api.themoviedb.org/3/${type}/${id}/watch/providers`
      );

      detailsUrl.searchParams.set('api_key', apiKey);
      detailsUrl.searchParams.set('language', 'de-DE');

      providersUrl.searchParams.set('api_key', apiKey);

      const [detailsResponse, providersResponse] = await Promise.all([
        fetch(detailsUrl),
        fetch(providersUrl)
      ]);

      if (!detailsResponse.ok || !providersResponse.ok) {
        throw new Error(`TMDB-Daten für ${type} ${id} konnten nicht geladen werden`);
      }

      const details = await detailsResponse.json();
      const providers = await providersResponse.json();

      return {
        type,
        data: {
          ...details,

          // AT = Österreich
          // Für Deutschland stattdessen DE verwenden
          watchProviders: providers.results?.AT || {}
        }
      };
    })
  );

  homeCache.movies = results
    .filter(result =>
      result.status === 'fulfilled' &&
      result.value.type === 'movie'
    )
    .map(result => result.value.data);

  homeCache.tvShows = results
    .filter(result =>
      result.status === 'fulfilled' &&
      result.value.type === 'tv'
    )
    .map(result => result.value.data);

  homeCache.expiresAt =
    Date.now() +
    (
      homeCache.movies.length + homeCache.tvShows.length === requests.length
        ? 10
        : 1
    ) * 60_000;
}

async function renderHome(req, res) {
  const apiKey = process.env.TMDB_API_KEY;

  if (apiKey && Date.now() >= homeCache.expiresAt) {
    loadingHomeContent ??= loadHomeContent(apiKey).finally(() => {
      loadingHomeContent = null;
    });
    await loadingHomeContent;
  }

  res.render('index', {
    layout: './layouts/main',
    movies: homeCache.movies,
    tvShows: homeCache.tvShows
  });
}

server.get('/test-api', (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.status(500).send('TMDB_API_KEY fehlt.');
  }

  res.send('API-Key geladen');
});

server.get('/', renderHome);

server.get('/index', renderHome);

server.get('/about', (req, res) => {
  res.render("about", {layout: "./layouts/main"});
});

server.get('/contact', (req, res) => {
  res.render("contact", {layout: "./layouts/main"});
});

server.get('/privacy_policy', (req, res) => {
  res.render("privacy_policy", {layout: "./layouts/main"});
});

server.get('/impressum', (req, res) => {
  res.render("impressum", {layout: "./layouts/main"});
});

server.use('/movies', moviesRouter);

server.use('/tvshows', tvShowsRouter);

server.get('/help', (req, res) => {
  res.render('help', { layout: './layouts/main', submitted: false });
});

server.post('/help', (req, res) => {
  res.render('help', { layout: './layouts/main', submitted: true });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
