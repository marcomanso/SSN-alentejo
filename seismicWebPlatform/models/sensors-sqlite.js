'use strict';

const util    = require('util');
const sqlite3 = require('sqlite3');
const Sensor = require('./sensor-class');

var debug = require('debug')('seismic');

sqlite3.verbose();
var db; // store the database connection here

exports.connectDB = function() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    var dbfile = process.env.SQLITE_FILE || "db/db.sqlite3";
    db = new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
      if (err) 
        reject(err);
      else {
        debug('Opened SQLite3 database '+ dbfile);
        resolve(db);
      }
    }); 
  });
};

exports.create = function(sensorkey, name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL) {
  return exports.connectDB()
    .then(() => {
    var sensor = new Sensor(sensorkey, name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL);
    return new Promise((resolve, reject) => {
      db.run("INSERT INTO sensors "
             +"( sensorkey, name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL ) "
             +"VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
             [ sensorkey, name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL ], err => {
        if (err) 
          reject(err);
        else {
          debug('CREATE '+ util.inspect(sensor));
          resolve(sensor);
        }
      }); 
    });
  }); 
};

exports.update = function(sensorkey, name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL) {
  return exports.connectDB()
    .then(() => {
    var sensor = new Sensor(sensorkey, name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL);
    return new Promise((resolve, reject) => {
      db.run("UPDATE sensors "+
             "SET  name = ?, description = ?, lat = ?, lon = ?, elevation = ?, model = ?, model_URL = ?, timecreated = ?, sensor_URL = ?, data_URL = ?"+
             "WHERE sensorkey = ?",
             [ name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL, sensorkey ], err => {
        if (err) 
          reject(err);
        else {
          debug('UPDATE '+ util.inspect(sensor));
          resolve(sensor);
        }

      }); 
    });
  }); 
};

exports.read = function(sensorkey) {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM sensors WHERE sensorkey = ?", 
             [ sensorkey ], (err, row) => {
        if (err) 
          reject(err);
        else {
          var sensor;
          if ( typeof row !== 'undefined') {
            var sensor = new Sensor(row.sensorkey, row.name, row.description, row.lat, row.lon, row.elevation, row.model, row.model_URL, row.timecreated, row.sensor_URL, row.data_URL);
            debug('READ '+ util.inspect(sensor));
          }
          resolve(sensor);
        }
      }); 
    });
  }); 
};

exports.destroy = function(sensorkey) {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM sensors WHERE sensorkey = ?;",
             [ sensorkey ], err => {
        if (err) 
          reject(err);
        else {
          debug('DESTROY '+ sensorkey);
          resolve(); 
        }
      }); 
    });
  }); 
};

exports.readAll = function() {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      var sensorList = [];
      db.each("SELECT * FROM sensors", (err, row) => {
        if (err) 
          reject(err);
        else {
          sensorList.push(
            new Sensor(row.sensorkey, row.name, row.description,  row.lat,  row.lon, row.elevation, row.model, row.model_URL,  row.timecreated, row.sensor_URL, row.data_URL));
        }
      },
      (err, num) => {
        if (err) 
          reject(err);
        else 
          resolve(sensorList);
      }); 
    });
  }); 
};

exports.keylist = function() {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      var keyz = [];
      db.each("SELECT sensorkey FROM sensors", (err, row) => {
        if (err) 
          reject(err);
        else 
          keyz.push(row.sensorkey);
      },
              (err, num) => {
        if (err) 
          reject(err);
        else 
          resolve(keyz);
      }); 
    });
  }); 
};

exports.count = function() {
  return exports.connectDB().then(() => {
    return new Promise((resolve, reject) => {
      db.get("SELECT count(sensorkey) AS count FROM sensors",
             (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      }); 
    });
  }); 
};
