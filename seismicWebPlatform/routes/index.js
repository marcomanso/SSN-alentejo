var express = require('express');
var router = express.Router();
var sensors = require('../models/sensors-sqlite')

/* GET home page. */
router.get('/', function(req, res, next) {
  sensors.readAll()
  .then(sensorlist => {
    res.render('index', 
             { title: 'Seismic Sensors',
              sensorlist: sensorlist,
              breadcrumbs: [ { href: '/', text: 'Home' } ]
             }) 
  })
  .catch(err => { 
    next(err); 
  });
});

module.exports = router;
