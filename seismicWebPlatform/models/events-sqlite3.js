'use strict';

const util    = require('util');
const sqlite3 = require('sqlite3');

  /*  
  eventData.sensorid
  eventData.time_start_ms =date.getTime(); //!=0 indicated ongoing event
  eventData.time_end_ms   =0;
  eventData.d_accel_x     =average_x-sensorCalibrationMap.get(sensorid)[0];
  eventData.d_accel_y     =average_y-sensorCalibrationMap.get(sensorid)[1];
  eventData.d_accel_z     =average_z-sensorCalibrationMap.get(sensorid)[2];
  eventData.d_accel_rms   =stat.rootMeanSquare([eventData.d_accel_x,eventData.d_accel_y,eventData.d_accel_z]);
  eventData.accel_rms     =stat.rootMeanSquare([eventData.max_accel_x,eventData.max_accel_y,eventData.max_accel_z]);
  eventData.stddev_rms    =sdev_rms;
  */

var debug = require('debug')('seismic');

sqlite3.verbose();
var _dbEvents; // store the database connection here

exports.connectDB = function() {
  return new Promise((resolve, reject) => {
    if (_dbEvents) return resolve(_dbEvents);
    var dbfile = process.env.SQLITE_FILE || "db/db.sqlite3";
    _dbEvents = new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
      if (err) 
        reject(err);
      else {
        debug('Opened SQLite3 database '+ dbfile);
        resolve(_dbEvents);
      }
    }); 
  });
};

exports.create = function(
  sensorkey, time_start_ms, time_end_ms, 
  d_accel_x, d_accel_y, d_accel_z, d_accel_rms, 
  accel_rms, stddev_rms) {
    return exports.connectDB()
    .then(() => {
      return new Promise((resolve, reject) => {
        _dbEvents.run("INSERT INTO events "
             +"( sensorkey, time_start_ms, time_end_ms, d_accel_x, d_accel_y, d_accel_z, d_accel_rms, accel_rms, stddev_rms ) "
             +"VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?);",
             [ sensorkey, time_start_ms, time_end_ms, 
              d_accel_x, d_accel_y, d_accel_z, d_accel_rms, 
              accel_rms, stddev_rms ], err => {
        if (err) 
          reject(err);
        else {
          debug('CREATE event for '+ sensorkey);
          resolve(sensorkey);
        }
      }); 
    });
  }); 
};

