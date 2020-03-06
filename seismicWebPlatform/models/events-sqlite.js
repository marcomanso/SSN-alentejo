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

exports.create = function(
  sensorkey, time_start_ms, time_end_ms, 
  d_accel_x, d_accel_y, d_accel_z, d_accel_rms,
  accel_x,   accel_y,   accel_z,   accel_rms,
  stddev_rms) {
    return exports.connectDB()
    .then(() => {
      return new Promise((resolve, reject) => {
        db.run("INSERT INTO events "
             +"( sensorkey, time_start_ms, time_end_ms, d_accel_x, d_accel_y, d_accel_z, d_accel_rms, accel_x, accel_y, accel_z, accel_rms, stddev_rms ) "
             +"VALUES ( ?, ?, ?,   ?, ?, ?, ?,   ?, ?, ?, ?,  ?);",
             [ sensorkey, time_start_ms, time_end_ms, 
               d_accel_x, d_accel_y, d_accel_z, d_accel_rms,
               accel_x,   accel_y,   accel_z,   accel_rms,
               stddev_rms ], err => {
        if (err) {
          console.log("DB EVENTS - insert error "+err)
          reject(err);
        }
        else {
          //console.log('DB CREATE event for '+ sensorkey);
          //debug('DB CREATE event for '+ sensorkey);
          resolve(sensorkey);
        }
      }); 
    });
  }); 
};

exports.readAll = function() {
  return exports.connectDB()
  .then(() => {
    return new Promise((resolve, reject) => {
      var eventList = [];
      db.each("SELECT * FROM events", (err, row) => {
        if (err) 
          reject(err);
        else {
console.log("-- readAll ");         
          let event={};
          event.sensorkey    =row.sensorkey;
          event.time_start_ms=row.time_start_ms;
          event.time_end_ms  =row.time_end_ms;
          event.d_accel_x    =row.d_accel_x;
          event.d_accel_y    =row.d_accel_y;
          event.d_accel_z    =row.d_accel_z; 
          event.d_accel_rms  =row.d_accel_rms;
          event.accel_x      =row.accel_x;
          event.accel_y      =row.accel_y;  
          event.accel_z      =row.accel_z;   
          event.accel_rms    =row.accel_rms;
          event.stddev_rms   =row.stddev_rms;
          eventList.push(event);
console.log("-- added event from "+row.sensorkey);          
        }
      },
      (err, num) => {
      if (err) {
        console.log("DB EVENTS - read error "+err)
        reject(err);
      }
      else 
        resolve(eventList);
      }); 
    });
  })
};
