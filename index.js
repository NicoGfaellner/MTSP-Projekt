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

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});