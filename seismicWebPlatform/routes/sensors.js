var router  = require('express').Router();
var sensors = require('../models/sensors-sqlite');
var scrapeUtils   = require('../utils/scrape');
var htmlUtils = require('../utils/utils');

const http = require('http');
var debug = require('debug')('seismic:sensors');

var sensorFilesDir = (process.env.SENSOR_DATA_FILE_DIR || 'data');

/* GET users listing. */
router.get('/', (req, res, next) => {
  sensors.readAll()
    .then(sensorlist => {
    res.render('sensors', 
               { title: 'Seismic Sensors',
                sensorlist: sensorlist,
                breadcrumbs: [ { href: '/', text: 'Home' }, 
                              { active: true, text: "Sensors List" } ]
               }) 
    })
    .catch(err => { 
      next(err); 
    });
});

// Add sensor.
router.get('/add', (req, res, next) => {
  //res.send('sensor list here');  
  res.render('sensoredit', {
    title: "Add New Sensor",        
    docreate: true,        
    sensorkey: "",        
    sensor: undefined,
    breadcrumbs: [ { href: '/', text: 'Home' }, 
                  { active: true, text: "Add Sensor" } ],
    hideAddSensor: true
  });
});

// Edit sensor.
router.get('/edit/:key', (req, res, next) => {
//router.get('/edit', (req, res, next) => {
  sensor = sensors.read(req.params.key)
  .then (sensor => {
    //res.send('sensor list here');  
    res.render('sensoredit', {
      title: "Edit Sensor",        
      docreate: false,        
      sensorkey: sensor.sensorkey,        
      sensor: sensor,
      breadcrumbs: [ { href: '/', text: 'Home' }, 
                    { active: true, text: "Edit Sensor" } ],
      hideAddSensor: true
    });
  })
  .catch ( err => {
         next(err); 
  });
});

// Save sensor
router.post('/save', (req, res, next) => {
  var sensor;
  if (req.body.docreate === "create") {
    sensor = sensors.create(req.body.sensorkey,
                       req.body.name, 
                       req.body.description, 
                       req.body.latitude, 
                       req.body.longitude, 
                       req.body.elevation, 
                       req.body.model, 
                       req.body.model_URL, 
                       req.body.timecreated,
                       req.body.sensor_URL,     
                       req.body.data_URL);    
  } else {
    sensor = sensors.update(req.body.sensorkey,
                       req.body.name, 
                       req.body.description, 
                       req.body.latitude, 
                       req.body.longitude, 
                       req.body.elevation, 
                       req.body.model, 
                       req.body.model_URL, 
                       req.body.timecreated,
                       req.body.sensor_URL,     
                       req.body.data_URL);    
  }
  sensor
  .then(sensor => {        
    res.redirect('/sensors/view/'+ req.body.sensorkey);    
  })    
  .catch(err => { 
    next(err); 
  });
});

//router.get('/view', (req, res, next) => {
router.get('/view/:key', (req, res, next) => {
//  sensors.read(req.query.key)
  sensors.read(req.params.key)
    .then(sensor => {
    res.render('sensorview', {
      title: sensor ? sensor.name : "",
      sensorkey: req.params.key,
      sensor: sensor,
      breadcrumbs: [ { href: '/', text: 'Home' }, 
                     { active: true, text: sensor.name } ]
    });    
  })    
  .catch(err => { 
    next(err); 
  });
});

router.get('/destroy/:key', (req, res, next) => { 
  sensors.read(req.params.key)
    .then(sensor => {
      res.render('sensordestroy', {
        title: sensor.name,
        sensorkey: req.params.key,
        sensor: sensor,
        breadcrumbs: [ { href: '/', text: 'Home' }, 
                      { active: true, text: sensor.name } ]
      });    
    })    
    .catch(err => { next(err); });
});

router.post('/destroy/confirm', (req, res, next) => {  
  sensors.destroy(req.body.sensorkey)    
    .then(() => { res.redirect('/'); })   
    .catch(err => { next(err); });
});

router.post('/addsensor', (req, res, next) => { 
  sensor = sensors.create(req.body.sensorkey,
                          req.body.name, 
                          req.body.description, 
                          req.body.latitude, 
                          req.body.longitude, 
                          req.body.elevation, 
                          req.body.model, 
                          req.body.model_URL, 
                          req.body.timecreated,
                          req.body.sensor_URL,     
                          req.body.data_URL);
  sensor
  .then(sensor => {        
    debug("Added new sensor :"+sensor.sensorkey);
    res.end("OK!");
  })    
  .catch(err => { 
    debug("Error: "+err);
    res.end("Error!");
  });
});

router.post('/updatesensor', (req, res, next) => { 
  sensor = sensors.update(req.body.sensorkey,
                          req.body.name, 
                          req.body.description, 
                          req.body.latitude, 
                          req.body.longitude, 
                          req.body.elevation, 
                          req.body.model, 
                          req.body.model_URL, 
                          req.body.timecreated,
                          req.body.sensor_URL,     
                          req.body.data_URL);
  sensor
  .then(sensor => {        
    debug("Updated sensor :"+sensor.sensorkey);
    res.end("OK!");
  })    
  .catch(err => { 
    debug("Error: "+err);
    res.end("Error!");
  });
});

router.post('/deletesensor', (req, res, next) => { 
  sensors.destroy(req.body.sensorkey)
  .then(() => {        
    debug("Deleted sensor :"+req.body.sensorkey);
    res.end("OK!");
  })    
  .catch(err => { 
    debug("Error: "+err);
    res.end("Error!");
  });
});

//
// SENSOR DATA (FILE)
renderSensorFile = function (res, sensor, dir, filename) {
  res.render('sensordataview', {
    title: sensor.name,
    sensor: sensor,
    dir: dir,
    filename: filename,
    breadcrumbs: [{ href: '/', text: 'Home' }, 
                  { href: '/sensors/datafiles/'+sensor.sensorkey+'/', text: 'Sensor Files' }, 
                  { active: true, text: sensor.name+" file" } ]
  });
}
router.get('/showdata/:key/:filename', (req, res, next) => { 
  var sensorkey = req.params.key;
  var filename = req.params.filename;
  sensors.read(req.params.key)
    .then(sensor=> {
    dir = '/'+sensorFilesDir+'/'
      + sensor.sensorkey;
    renderSensorFile(res, sensor, dir, filename);
  })
  .catch( err => { next(err); })
});
router.get('/showdata/:key/:filename/:year', (req, res, next) => { 
  var sensorkey = req.params.key;
  var filename = req.params.filename;
  sensors.read(req.params.key)
    .then(sensor=> {
    dir = '/'+sensorFilesDir+'/'
      + sensor.sensorkey
      +'/'+req.params.year;
    renderSensorFile(res, sensor, dir, filename);
  })
    .catch( err => { next(err); })
});
router.get('/showdata/:key/:filename/:year/:month', (req, res, next) => { 
  var sensorkey = req.params.key;
  var filename = req.params.filename;
  sensors.read(req.params.key)
    .then(sensor=> {
    dir = '/'+sensorFilesDir+'/'
      + sensor.sensorkey
      +'/'+req.params.year
      +'/'+req.params.month;
    renderSensorFile(res, sensor, dir, filename);
  })
  .catch( err => { next(err); })
});
router.get('/showdata/:key/:filename/:year/:month/:day', (req, res, next) => { 
  var sensorkey = req.params.key;
  var filename = req.params.filename;
  sensors.read(req.params.key)
    .then(sensor=> {
      dir = '/'+sensorFilesDir+'/'
            + sensor.sensorkey
            +'/'+req.params.year
            +'/'+req.params.month
            +'/'+req.params.day;
    renderSensorFile(res, sensor, dir, filename);
  })
  .catch( err => { next(err); })
});


    /*
    //var path = sensorFilesDir +'/' + sensor.sensorkey;
    res.render('sensordataview', {
      title: sensor.name,
      sensor: sensor,
      dir: '/'+sensorFilesDir +'/' + sensor.sensorkey,
      filename: filename,
      breadcrumbs: [{ href: '/', text: 'Home' }, 
                    { href: '/sensors/datafiles/'+sensor.sensorkey+'/', text: 'Sensor Files' }, 
                    { active: true, text: sensor.name+" file" } ]
    });    
    */


//
// SENSOR DATA (LIVE)
router.get('/live/:key', (req, res, next) => { 
  var sensorkey = req.params.key;
  sensors.read(req.params.key)
    .then(sensor=> {
    var path = sensor.sensor_URL;
    res.render('sensorlive', {
      title: sensor.name,
      sensor: sensor,
      breadcrumbs: [{ href: '/', text: 'Home' }, 
                    { active: true, text: sensor.name+" live" } ]
    });    
  })
    .catch( err => { next(err); })

});

// SENSOR FILES - organised by YEAR , MONTH , DAY
//
readDirsAndFiles = function (res, sensor, path, year, month, day, next) {

  var files = [];
  var directories = [];
  
  allFiles = fs.readdirSync(path);

  for (f of allFiles) {
    if (f.indexOf('.') !== 0) {
      if (f.endsWith('.txt') || f.endsWith('.log') || f.endsWith('.json') || f.endsWith('.zip') || f.endsWith('.gz') || f.endsWith('.tgz'))
        files.push(f);
      else
        directories.push(f);
    }
  }
  
  res.render('sensorfiles', {
    title: sensor.name,
    sensor: sensor,
    directories: directories,
    year: year,
    month: month, 
    day: day,
    sensorFilesDir: sensorFilesDir,
    files: files,
    //datafile: data,
    breadcrumbs: [ { href: '/', text: 'Home' }, 
                  { active: true, text: sensor.name+" Files" } ]
  });

  /*
  scrapeUtils.getSensorFiles(sensor.name, path)
    .then( (files, directories) => {
      //debug("got files: "+files.toString());
      
       console.log("got files: "+files.toString());
    
       res.render('sensorfiles', {
        title: sensor.name,
        sensor: sensor,
        directories: directories,
        files: files,
        //datafile: data,
        breadcrumbs: [ { href: '/', text: 'Home' }, 
                      { active: true, text: sensor.name+" Files" } ]
    })
  })
  .catch( err => { next(err); })
  */
  
  
}

// ROOT - get years
router.get('/datafiles/:key', (req, res, next) => { 
  var directories = [];
  var files = [];  
  var year, month, day;
  
  /* local files */
  sensors.read(req.params.key)
    .then(sensor=> {
      var path = 'public/'+sensorFilesDir +'/' + sensor.sensorkey;  
    readDirsAndFiles(res, sensor, path, year, month, day, next);
    })
    .catch(err => { next(err); });
});

// YEARS - get months
router.get('/datafiles/:key/:year', (req, res, next) => { 
  var files = [];
  var year, month, day;
  
  /* local files */
  sensors.read(req.params.key)
    .then(sensor=> {

    year = req.params.year;
    
    var path = 'public/'+sensorFilesDir +'/' + sensor.sensorkey+'/'+year;
    
    readDirsAndFiles(res, sensor, path, year, month, day, next);

  })
  .catch(err => { next(err); });

});

// MONTH - get days
router.get('/datafiles/:key/:year/:month', (req, res, next) => { 
  var files = [];
  var year, month, day;
  
  /* local files */
  sensors.read(req.params.key)
    .then(sensor=> {

    year = req.params.year;
    month = req.params.month;

    var path = 'public/'+sensorFilesDir +'/' + sensor.sensorkey+'/'+year + '/' + month;

    readDirsAndFiles(res, sensor, path, year, month, day, next);

  })
  .catch(err => { next(err); });

});

// DAY - get files
router.get('/datafiles/:key/:year/:month/:day', (req, res, next) => { 
  var files = [];
  var year, month, day;
  
  /* local files */
  sensors.read(req.params.key)
    .then(sensor=> {

    year = req.params.year;
    month = req.params.month;
    day = req.params.day;

    var path = 'public/'+sensorFilesDir +'/' + sensor.sensorkey+'/'+year + '/' + month + '/' + day;

    readDirsAndFiles(res, sensor, path, year, month, day, next);

  })
  .catch(err => { next(err); });

});

module.exports = router;
