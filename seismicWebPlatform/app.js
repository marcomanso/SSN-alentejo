var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var FileStreamRotator = require('file-stream-rotator');
const fs = require('fs');
var error = require('debug')('sensors:error');

var index = require('./routes/index');
var sensors = require('./routes/sensors');
var users = require('./routes/users');
var certificates = require('./routes/certificates');

var app = express();

//LOG routines
var accessLogStream;
if (process.env.REQUEST_LOG_FILE) {    
  var logDirectory = path.dirname(process.env.REQUEST_LOG_FILE);   fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
  accessLogStream = FileStreamRotator.getStream({
    filename: process.env.REQUEST_LOG_FILE,      
    frequency: 'daily',
    verbose: false    
  });
}
app.use(logger(process.env.REQUEST_LOG_FORMAT || 'dev', 
               {stream: accessLogStream ? accessLogStream : process.stdout}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/sensors', sensors);
app.use('/users', users);
app.use('/certificates', certificates);

//bootstrap
app.use('/vendor/bootstrap', express.static(
  path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use('/vendor/jquery', express.static(
  path.join(__dirname, 'node_modules', 'jquery', 'dist')));

app.use('/about', (req, res, next) => {
  res.render('about', 
             { title: 'About',
              breadcrumbs: [ { href: '/', text: 'Home' } ],
             hideAddSensor: true });
});

process.on('uncaughtException', function(err) {  
  error("I've crashed!!! - "+ (err.stack || err));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', 
             { title: 'Seismic Sensors',
               breadcrumbs: [ { href: '/', text: 'Home' } ]
             });
});

module.exports = app;
