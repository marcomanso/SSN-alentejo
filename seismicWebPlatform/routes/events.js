var router  = require('express').Router();

var scrapeUtils   = require('../utils/scrape');
var htmlUtils = require('../utils/utils');

const http = require('http');
var debug = require('debug')('seismic:sensors');

//EVENTS
router.get('/', (req, res, next) => { 
  res.send('working on it .....');
});

module.exports = router;
