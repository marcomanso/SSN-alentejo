'use strict';

const util     = require('util');
const sqlite3  = require('sqlite3');
const datautils= require('../utils/datautils');

const MAX_NUMBER_RECORDS = 1000;

  /*  
  eventData.sensorid
  eventData.time_start_ms =date.getTime(); //!=0 indicated ongoing event
  eventData.time_end_ms   =0;
  eventData.d_accel_x     =average_x-sensorCalibrationMap.get(sensorid)[0];
  eventData.d_accel_y     =average_y-sensorCalibrationMap.get(sensorid)[1];
  eventData.d_accel_z     =average_z-sensorCalibrationMap.get(sensorid)[2];
  eventData.d_accel   
  eventData.accel    
  eventData.stddev_abs    =sdev_abs;
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
  d_accel_x, d_accel_y, d_accel_z, d_accel,
  accel_x,   accel_y,   accel_z,   accel,
  stddev_abs, mmi) {
    return exports.connectDB()
    .then(() => {
      return new Promise((resolve, reject) => {
        db.run("INSERT INTO events "
             +"( sensorkey, time_start_ms, time_end_ms, d_accel_x, d_accel_y, d_accel_z, d_accel, accel_x, accel_y, accel_z, accel, stddev_abs, mmi ) "
             +"VALUES ( ?, ?, ?,   ?, ?, ?, ?,   ?, ?, ?, ?,  ?);",
             [ sensorkey, time_start_ms, time_end_ms, 
               d_accel_x, d_accel_y, d_accel_z, d_accel,
               accel_x,   accel_y,   accel_z,   accel,
               stddev_abs, mmi ], err => {
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

exports.readAll = function(lastvalue) {
  return exports.connectDB()
  .then(() => {
    return new Promise((resolve, reject) => {
      let eventList = [];
      let WHERE_CLAUSE ="";
      if (typeof lastvalue !== 'undefined')
        WHERE_CLAUSE=" WHERE time_start_ms > "+lastvalue+" ";
      db.each("SELECT * FROM events "+WHERE_CLAUSE+" ORDER BY time_start_ms DESC LIMIT "+MAX_NUMBER_RECORDS, (err, row) => {
        if (err) 
          reject(err);
        else {
          let event={};
          event.sensorkey    =row.sensorkey;
          event.time_start_ms=row.time_start_ms;
          event.time_end_ms  =row.time_end_ms;
          event.d_accel_x    =row.d_accel_x;
          event.d_accel_y    =row.d_accel_y;
          event.d_accel_z    =row.d_accel_z; 
          event.d_accel      =row.d_accel;
          event.accel_x      =row.accel_x;
          event.accel_y      =row.accel_y;  
          event.accel_z      =row.accel_z;   
          event.accel        =row.accel;
          event.stddev_abs   =row.stddev_abs;
          event.mmi          =row.mmi;
          eventList.push(event);
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

exports.readAllMagnitudeAbove = function(mmi, lastvalue) {
  let WHERE_CLAUSE ="";
  if (typeof lastvalue !== 'undefined')
    WHERE_CLAUSE=" WHERE (mmi, time_start_ms) >= ("+mmi+", "+lastvalue+" ";
  else
    WHERE_CLAUSE=" WHERE mmi >= "+mmi+" ";
  return exports.connectDB()
  .then(() => {
    return new Promise((resolve, reject) => {
      let eventList = [];
      db.each("SELECT * FROM events "+WHERE_CLAUSE+" ORDER BY time_start_ms DESC LIMIT "+MAX_NUMBER_RECORDS, (err, row) => {
        if (err) 
          reject(err);
        else {
          let event={};
          event.sensorkey    =row.sensorkey;
          event.time_start_ms=row.time_start_ms;
          event.time_end_ms  =row.time_end_ms;
          event.d_accel_x    =row.d_accel_x;
          event.d_accel_y    =row.d_accel_y;
          event.d_accel_z    =row.d_accel_z; 
          event.d_accel      =row.d_accel;
          event.accel_x      =row.accel_x;
          event.accel_y      =row.accel_y;  
          event.accel_z      =row.accel_z;   
          event.accel        =row.accel;
          event.stddev_abs   =row.stddev_abs;
          event.mmi          =row.mmi;
          eventList.push(event);
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

exports.readAllSinceTime = function(datetime_h) 
{
  let datetime_now=new Date().getTime();
  let datetime_since=datetime_now - datetime_h*3600000;

  return exports.connectDB()
  .then(() => {
    return new Promise((resolve, reject) => {
      let eventList = [];
      db.each("SELECT * FROM events WHERE time_start_ms >= "+datetime_since+" ORDER BY time_start_ms DESC", (err, row) => {
        if (err) 
          reject(err);
        else {
          let event={};
          event.sensorkey    =row.sensorkey;
          event.time_start_ms=row.time_start_ms;
          event.time_end_ms  =row.time_end_ms;
          event.d_accel_x    =row.d_accel_x;
          event.d_accel_y    =row.d_accel_y;
          event.d_accel_z    =row.d_accel_z; 
          event.d_accel      =row.d_accel;
          event.accel_x      =row.accel_x;
          event.accel_y      =row.accel_y;  
          event.accel_z      =row.accel_z;   
          event.accel        =row.accel;
          event.stddev_abs   =row.stddev_abs;
          event.mmi          =mmi;
          eventList.push(event);
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
