var router  = require('express').Router();
var eventsDB = require('../models/events-sqlite');

var scrapeUtils   = require('../utils/scrape');
var htmlUtils = require('../utils/utils');

const http = require('http');
var debug = require('debug')('seismic:sensors');

/* GET events listing. */
router.get('/', (req, res, next) => {
  eventsDB.readAll()
    .then(eventslist => {
    res.render('events', 
               { title: 'Events',
                eventslist: eventslist,
                breadcrumbs: [ { href: '/', text: 'Home' }, 
                              { active: true, text: "Events List" } ]
               }) 
    })
    .catch(err => { 
      next(err); 
    });
});

module.exports = router;
