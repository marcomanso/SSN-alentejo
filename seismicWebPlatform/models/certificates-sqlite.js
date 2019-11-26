'use strict';

const util    = require('util');
const sqlite3 = require('sqlite3');

var debug = require('debug')('seismic');

var TABLE_NAME = "SensorCertificate";

var debug = require('debug')('certificates');

sqlite3.verbose();
var db; // store the database connection here

exports.connectDB = function() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    var dbfile = process.env.SENSOR_SQLITE_FILE || "sensordb/sensorDB.sqlite3";
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

exports.readPubKey = function(sensorkey) {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM "+TABLE_NAME+" WHERE sensorkey = ?", 
             [ sensorkey ], (err, row) => {
        if (err) 
          reject(err);
        else {
          var key;
          if ( typeof row.status !== 'undefined') {
            key=row.certificate;
            debug("Sensor="+row.sensorkey+" Certificate="+key);
          }
          resolve(key);
        }
      }); 
    });
  }); 
};

exports.isActive = function(sensorkey) {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM "+TABLE_NAME+" WHERE sensorkey = ?", 
             [ sensorkey ], (err, row) => {
        if (err)
          reject(err);
        else {
          var status=0;
          if ( typeof row.status !== 'undefined') {
            status=row.status;
            debug("Sensor="+row.sensorkey+" Status="+status);
          }
          resolve(status);
        }
      }); 
    });
  }); 
};

exports.setActiveStatus = function(sensorkey, status) {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      db.run("UPDATE "+TABLE_NAME
             + " SET status = ? WHERE sensorkey = ?", 
             [ status, sensorkey ], err => {
        if (err) 
          reject(err);
        else {
          debug('UPDATE sensor '+sensorkey+" status to "+ status);
          resolve(status);
        }
      });
    }); 
  });
};

exports.destroy = function(sensorkey) {
  return exports.connectDB()
    .then(() => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM "+TABLE_NAME + " WHERE sensorkey = ?;",
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
      db.each("SELECT * FROM "+TABLE_NAME, (err, row) => {
        if (err) 
          reject(err);
        else {
          sensorList.push([row.sensorkey, row.certificate, row.status]);
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
      db.each("SELECT sensorkey FROM "+TABLE_NAME, (err, row) => {
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
      db.get("SELECT count(sensorkey) AS count FROM "+TABLE_NAME,
             (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      }); 
    });
  }); 
};
