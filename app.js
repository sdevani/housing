var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var zillow = require('./app/lib/zillow/zillow.js');

var port = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('home');
});

app.post('/evaluate', function(req, res) {
  res.send('you got it ' + zillow.getData(req.body.address).price);
});

app.listen(port, function () {
  console.log('Housing app listening on port ' + port + '!');
});
