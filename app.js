var express = require('express');
var app = express();

var port = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('home');
});

app.post('/evaluate', function(req, res) {
  res.send('Not functional yet!');
});

app.listen(port, function () {
  console.log('Housing app listening on port ' + port + '!');
});
