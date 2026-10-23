//imports
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const {append} = require('express/lib/response');
const requestLogger = require('./middlewares/requestLogger');

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

server.get('/', (req, res) => {
  res.render("index", {layout: "./layouts/main"});
});

server.get('/index', (req, res) => {
  res.render("index", {layout: "./layouts/main"});
});

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

server.get('/movies', (req, res) => {
  res.render("movies", {layout: "./layouts/main"});
});

server.get('/tvshows', (req, res) => {
  res.render("tvshows", {layout: "./layouts/main"});
});

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