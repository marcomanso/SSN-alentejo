var router  = require('express').Router();
var certificates = require('../models/certificates-sqlite');

const http = require('http');
var debug = require('debug')('seismic:certificates');

/* GET users listing. */
router.get('/', (req, res, next) => {
  certificates.readAll()
    .then(certificateslist => {
    res.render('certificates', 
               { title: 'Sensor certificates',
                certificateslist: certificateslist,
                breadcrumbs: [ { href: '/', text: 'Home' }, 
                              { active: true, text: "Sensor Certificates" } ]
               }) 
  })
  .catch(err => { 
    next(err); 
  });
});

module.exports = router;
