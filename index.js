//imports
const express = require('express');
const expressLayouts = require('express-ejs-layouts');

//neue Instanz von express erstellen
const server = express();

//Template Engine EJS
server.use(expressLayouts);
server.set('layout', './layouts/main');
server.set('view engine', 'ejs');

server.get('/', (req, res) => {
  res.send('Hello World');
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});