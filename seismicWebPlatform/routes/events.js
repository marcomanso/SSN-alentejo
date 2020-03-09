var router        = require('express').Router();
const eventsDB    = require('../models/events-sqlite');

const scrapeUtils = require('../utils/scrape');
const htmlUtils   = require('../utils/utils');
const datautils   = require('../utils/datautils');

const http        = require('http');
const debug       = require('debug')('seismic:sensors');

/* GET events listing. */
router.get('/', (req, res, next) => {
  eventsDB.readAll()
    .then(eventslist => {
    res.render('events', 
               { title: 'Events',
                eventslist: eventslist,
                datautils:  datautils,
                breadcrumbs: [ { href: '/', text: 'Home' }, 
                              { active: true, text: "Events List" } ]
               }) 
    })
    .catch(err => { 
      next(err); 
    });
});


/* GET events listing. */
router.get('/mmi/:mmi', (req, res, next) => {
	eventsDB.readAllMagnitudeAbove(req.params.mmi)
    .then(eventslist => {
    res.render('events', 
               { title: 'Events',
                eventslist: eventslist,
                datautils:  datautils,
                breadcrumbs: [ { href: '/', text: 'Home' }, 
                              { active: true, text: "Events List" } ]
               }) 
    })
    .catch(err => { 
      next(err); 
    });
});

/* GET events listing. */
router.get('/datetime/:datetime', (req, res, next) => {
	eventsDB.readAllSinceTime(req.params.datetime)
    .then(eventslist => {
    res.render('events', 
               { title: 'Events',
                eventslist: eventslist,
                datautils:  datautils,
                breadcrumbs: [ { href: '/', text: 'Home' }, 
                              { active: true, text: "Events List" } ]
               }) 
    })
    .catch(err => { 
      next(err); 
    });
});

module.exports = router;
