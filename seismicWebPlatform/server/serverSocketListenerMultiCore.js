/**
* using WebSocket-Node
*/


var http    = require('http'),
    fs      = require('fs'),
    //Tail  = require('tail').Tail,
    Tail    = require('tail-stream'),
    url     = require('url'),
    nodeRSA = require('node-rsa'),
    mqtt    = require('mqtt'),
    stat    = require('simple-statistics'),
    //crypto = require('crypto');
    WebSocketServer = require('websocket').server;

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var certificates = require('../models/certificates-sqlite')
var sensorDB     = require('../models/sensors-sqlite')

var utils = require('../utils/utils.js');
var dataUtils = require('../utils/datautils.js');
var debug = require('debug')('seismic:server');

var rsa = new nodeRSA();
rsa.setOptions({signingScheme: 'pss-sha1'});

http.globalAgent.maxSockets = Infinity;

//

var MESSAGE_AUTH = process.env.MESSAGE_AUTH || "sensor"

var MESSAGE_BINARY_LENGTH = 20; // 20 = 5 values (each has 4bytes=32bits)

// DEFAULTS
var DEF_SENSOR_FREQUENCY = 100;
var DEF_SENSOR_RANGE_G   = 2;
var DEF_CONVERSION_RAGE  = 1;

// process.env.SENSOR_EVENT_THRESHOLD 1g?
var CALIBRATION_SAMPLES = 128;
var sensorCalibrationMap = new Map();
var sensorCalibrationStdDevMap = new Map();
var sensorCalibrationValuesXMap = new Map();
var sensorCalibrationValuesYMap = new Map();
var sensorCalibrationValuesZMap = new Map();

var DEF_EVENT_THRESHOLD_g = 0.1;
var DEF_REST_THRESHOLD_g = 0.001;


function addCalibrationValue(sensorid, accel_x, accel_y, accel_z) {
  if (typeof sensorCalibrationValuesXMap.get(sensorid) === 'undefined') {  
    sensorCalibrationValuesXMap.set(sensorid, []);
    sensorCalibrationValuesYMap.set(sensorid, []);
    sensorCalibrationValuesZMap.set(sensorid, []);
  }
  let valuesX=sensorCalibrationValuesXMap.get(sensorid);
  let valuesY=sensorCalibrationValuesYMap.get(sensorid);
  let valuesZ=sensorCalibrationValuesZMap.get(sensorid);
  valuesX.unshift(accel_x);
  valuesY.unshift(accel_y);
  valuesZ.unshift(accel_z);
  if (valuesX.length>CALIBRATION_SAMPLES) {
    valuesX.pop();
    valuesY.pop();
    valuesZ.pop();
  }
  sensorCalibrationValuesXMap.set(sensorid, valuesX);
  sensorCalibrationValuesYMap.set(sensorid, valuesY);
  sensorCalibrationValuesZMap.set(sensorid, valuesZ);
  //console.log("-- samples for calibration: "+valuesX.length);
}
function calculateCalibrationValues(sensorid) {
  //calculate average value
  if ( typeof sensorCalibrationValuesXMap.get(sensorid) !== 'undefined' ) {

    let samplesX=sensorCalibrationValuesXMap.get(sensorid);
    let samplesY=sensorCalibrationValuesYMap.get(sensorid);
    let samplesZ=sensorCalibrationValuesZMap.get(sensorid);
    let sampleSizeX=samplesX.length;

    if ( sampleSizeX >= CALIBRATION_SAMPLES) {
      //check if std.dev is lower than existing 
      //if not std.dev exists, accept calibration values
      let average_x=stat.mean(samplesX);
      let average_y=stat.mean(samplesY);
      let average_z=stat.mean(samplesZ);
      let sdev_x = stat.standardDeviation(samplesX);
      let sdev_y = stat.standardDeviation(samplesY);
      let sdev_z = stat.standardDeviation(samplesZ);
      let calibr_sdev=sensorCalibrationStdDevMap.get(sensorid);
      if (typeof calibr_sdev === 'undefined') {
        sensorCalibrationMap.set(sensorid, [average_x, average_y, average_z]);
        sensorCalibrationStdDevMap.set(sensorid, [sdev_x,sdev_y,sdev_z]);
        writeLogAndConsole("log_", sensorid+" first calibration to: "+average_x+" "+average_y+" "+average_z);
      }
      else {
        let calibr_rms=stat.rootMeanSquare(calibr_sdev);
        let sdev_rms  =stat.rootMeanSquare([sdev_x,sdev_y,sdev_z]);
        if (sdev_rms<calibr_rms) {
          sensorCalibrationMap.set(sensorid, [average_x, average_y, average_z]);
          sensorCalibrationStdDevMap.set(sensorid, [sdev_x,sdev_y,sdev_z]);
          writeLogAndConsole("log_", sensorid+" updated calibration to: "+average_x+" "+average_y+" "+average_z+" std.dev="+sdev_rms);
        }
      }
      /*
      let average_x=stat.mean(samplesX);
      let variance_x = stat.variance(samplesX);
      let sdev_x = stat.standardDeviation(samplesX);
      let average_y=stat.mean(samplesY);
      let variance_y = stat.variance(samplesY);
      let sdev_y = stat.standardDeviation(samplesY);
      let average_z=stat.mean(samplesZ);
      let variance_z = stat.variance(samplesZ);
      let sdev_z = stat.standardDeviation(samplesZ);
      sensorCalibrationMap.set(sensorid, [average_x, average_y, average_z]);
      console.log(sampleSizeX
        +"\t"+average_x+"\t"+variance_x+"\t"+sdev_x
        +"\t"+average_y+"\t"+variance_y+"\t"+sdev_y
        +"\t"+average_z+"\t"+variance_z+"\t"+sdev_z
        );
        */
    }
  }
}
function isCalibrated(sensorid) {
  if (typeof sensorCalibrationMap.get(sensorid) !== 'undefined')
    return true;
  return false;
}


//
// SENSOR MAP FOR SENSOR DATA
var sensorDBMap = {};
var sensorInfoMap = {};
var sensorEventMap = {};
function fillSensorInfoMap(sensorData) {
  /*
  MQTT status messages are to be JSON formatted as:
  {
    "sensorid": "4222973344b945d0b4918fd919dae63a", 

    "name": name
    "latitude": 38,
    "longitude": -7,
    "elevation": 0,
    "sensor_URL":
    "data_URL": 

    "frequency": 100,
    "range": 2,
    "conversion_range": 1,
    "last_update_sec": 1583165821,
   }
  */

  var sensor_frequency=1000.0/parseFloat(sensorData['period_ms']);
  if (isNaN(sensor_frequency)) {
    sensor_frequency = DEF_SENSOR_FREQUENCY;
  }
  var sensor_range_g=parseFloat(sensorData['max_range']);
  if (isNaN(sensor_range_g)) {
    sensor_range_g = DEF_SENSOR_RANGE_G;
  }
  var sensor_conversion_range=parseFloat(sensorData['conversion_scale_1g']);
  if (isNaN(sensor_conversion_range)) {
    sensor_conversion_range = DEF_CONVERSION_RAGE;
  }  
  //
  let sensor = {};
  sensor.sensorid =sensorData['sensor_id'];
  sensor.frequency=sensor_frequency;
  sensor.range    =sensor_range_g;
  sensor.conversion_range  =sensor_conversion_range;
  sensor.last_update_sec   =Math.round(date.getTime()/1000);
  sensor.last_update_micro =0;
  //
  let sensor_db=sensorDBMap[sensor.sensorid];
  sensor.name      =sensor_db.name;
  sensor.latitude  =sensor_db.latitude;
  sensor.longitude =sensor_db.longitude;
  sensor.elevation =sensor_db.elevation;
  sensor.sensor_URL=sensor_db.sensor_URL;
  sensor.data_URL  =sensor_db.data_URL;
  //
  sensorInfoMap[sensor.sensorid]=sensor;
}


//
// MQTT
var DEF_MQTT_SERVER     = "server1.particle-summary.pt"
var DEF_MQTT_PORT       = 18830
var DEF_MQTT_CLIENT_NAME= "ssnalentejo_sensor_server"
var DEF_MQTT_TOPIC_MAIN = "ssnalentejo" 

var PUBLISH_PERIOD      = 1000 // = 1 second

MQTT_SERVER     = (process.env.MQTT_SERVER      || DEF_MQTT_SERVER); 
MQTT_PORT       = (process.env.MQTT_PORT        || DEF_MQTT_PORT);
MQTT_TOPIC_MAIN = (process.env.MQTT_TOPIC_MAIN  || DEF_MQTT_TOPIC_MAIN); 

var MQTT_TOPIC_PUB_TEST  = MQTT_TOPIC_MAIN+"/test" 
var MQTT_TOPIC_PUB_INFO  = "/info" 
var MQTT_TOPIC_PUB_EVENT = "/event" 

var mqtt_client;

function mqttSetup() {

  mqtt_client  = mqtt.connect('mqtt://'+MQTT_SERVER, {port: MQTT_PORT});
  mqtt_client.on('error',function(error){ 
    console.log("Can't connect: "+error);
  });
  mqtt_client.on('connect', function () {
    console.log("MQTT connect to "+MQTT_SERVER);
    //mqtt_client.subscribe(MQTT_TOPIC_PUB, function (err) {
    //  if (!err) {
    //    console.log("MQTT subscribe to "+MQTT_TOPIC_PUB);
    //  }
    //});
    //mqtt_client.publish(MQTT_TOPIC_PUB, 'Hello SSN')
  });
  mqtt_client.on('message', function (topic, message) {
    // message is Buffer
    console.log("topic: "+topic+" | message:"+message.toString())
  });
}

function mqttPublishSensorInfoMessage(sensorId) {

  var time_now = date.getTime();
  if ( (time_now-1000*sensorInfoMap[sensorId].last_update_sec) > PUBLISH_PERIOD ) {
    //console.log("-- now  time "+date.getTime());
    //console.log("-- last time "+(1000*sensorInfoMap[sensorId].last_update_sec).toString());
    sensorInfoMap[sensorId].last_update_sec=Math.round(time_now/1000);
    mqtt_client.publish(MQTT_TOPIC_MAIN+"/"+sensorId+MQTT_TOPIC_PUB_INFO, JSON.stringify(sensorInfoMap[sensorId]))
  }
}
function mqttPublishSensorEventMessage(sensorId) {
    mqtt_client.publish(MQTT_TOPIC_MAIN+"/"+sensorId+MQTT_TOPIC_PUB_EVENT, 'Hello SSN')
}


//
// FILES AND LOGS
//

//TODO - organise by year, month - compress
var basePath = 'public/'+(process.env.SENSOR_DATA_FILE_DIR || 'data');

if (!fs.existsSync(basePath)){
  fs.mkdirSync(basePath);
}

function checkDirectoryExistsSync(basePath) {
  if (!fs.existsSync(basePath)){
    fs.mkdirSync(basePath);
  }
}

function writeIt (dateW, sensorName, message, next) {
  var sensorPath = basePath
          +"/"+sensorName
          +"/"+date.getUTCFullYear()
          +"/"+utils.getPaddedNumber(date.getUTCMonth()+1)
          +"/"+utils.getPaddedNumber(date.getUTCDate());  
  var filename = 
      sensorName
      +"_"+utils.getDateTime_In_YYYYMMDD_HH(dateW)+'.txt';
  fs.appendFile(sensorPath+"/"+filename, message+'\n', function (err) {
    if (err) {
      next(err);
    }
  });
}

function writeSensorData(sensorName, message) {
  //create under year, month, day  
  //var sensorPath = basePath + "/" + name;
  date = new Date();  
  writeIt (date, sensorName, message, function (err) {
    //first time might be OK
    //dir and/or file might not exist - need to create it
    var sensorPath = basePath+"/"+sensorName;
    checkDirectoryExistsSync(sensorPath);
    sensorPath+="/"+date.getUTCFullYear();
    checkDirectoryExistsSync(sensorPath);
    sensorPath+="/"+utils.getPaddedNumber(date.getUTCMonth()+1);
    checkDirectoryExistsSync(sensorPath);
    sensorPath+="/"+utils.getPaddedNumber(date.getUTCDate());
    checkDirectoryExistsSync(sensorPath);
    //second time - if error again give up....
    writeIt( date, sensorName, message, function (err) { 
      console.log('Error: '+err);
    });
  });
}
function writeLog(name, message) {
  //create under year, month, day  
  var sensorPath = basePath + "/" + name;
  date = new Date();
  var filename   = utils.getDateTime_In_YYYYMMDD_HH(new Date())+'.txt';
  checkDirectoryExistsSync(sensorPath);
  fs.appendFile(sensorPath+"/"+filename, message+'\n', function (err) {
    if (err) console.log('Error: '+err);
  });
}
function writeLogAndConsole(name, message) {
  console.log(message); //remove in production environment
  writeLog(name, message);
}

function getLiveDataFilename(name) {
  date = new Date();
  return basePath 
    + "/" + name 
    + "/" + date.getUTCFullYear()
    + "/" + utils.getPaddedNumber(date.getUTCMonth()+1)
    + "/" + utils.getPaddedNumber(date.getUTCDate())
    + name + "_"+utils.getDateTime_In_YYYYMMDD_HH(new Date())+'.txt';                
}

function getLiveDataDir(name) {
  return basePath + "/" + name + "/";                
}

function streamFile(filename, clientWS) {
  //var tail_options= {separator: /[\r]{0,1}\n/, fromBeginning: false, fsWatchOptions: {}, follow: true, logger: console};
  var tailfd;
  try {
    
    // Tail-stream
    //tailfd = new Tail(filename, "\n", {  }, true);

    tailfd = Tail.createReadStream(filename, {
      beginAt: 'end',
      onMove: 'end',
      detectTruncate: true,
      onTruncate: 'end',
      endOnError: false
    });    
    
    tailfd.on("data", data => {
      var lines = data.toString('utf8').split('\n');
      lines.forEach( line => {
        clientWS.send(line);
      });
    });
    tailfd.on("eof", data => {
    });
    tailfd.on("error", error => {
      //writeLogAndConsole("log_", error);
    });

  }
  catch(err) { writeLogAndConsole("log_", err); };
  
  return tailfd;
}


function rejectRequest(req) {
  writeLogAndConsole("log_", "wsserver.on request - from address " + req.remoteAddress + " connection rejected ");
  req.reject();
}


if (cluster.isMaster) {

  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
  }
  cluster.on('exit', function(worker, code, signal) {
      console.log('worker ' + worker.process.pid + ' died');
      // cluster.fork(); //replace worker?
  });
  
} else { 

  mqttSetup();

  var server = http.createServer( function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end();
  }).listen(process.env.PORT || 3030);

  var wsserver = new WebSocketServer();
  /*
  wsserver.mount({ httpServer: server, 
		autoAcceptConnections: false });
  */
  wsserver.mount({ httpServer: server, 
                  autoAcceptConnections: false,                   
                  fragmentOutgoingMessages: false,
                  keepalive:true, 
                  keepaliveInterval:15000, 
                  keepaliveGracePeriod:15000, 
                  closeTimeout:0 });

  writeLogAndConsole("log_","Server started at "+utils.getDateTime_InYYYYMMDD_HHMMSS(new Date()));

  wsserver.on('request', function(req) {
    
    if (req.requestedProtocols[0] === "client") {

      //get requested sensor ID
      var sensorId = req.resource;

      if (!sensorId) {
        var connectionClient = req.reject();
        writeLogAndConsole("log_", "client: wsserver.on request - from client " + req.remoteAddress + " cannot find sensor "+sensorId);
      }
      else {
        writeLogAndConsole("log_", "client: wsserver.on request - accept connection from "+req.remoteAddress + " protocol: "+req.requestedProtocols+" for sensor "+sensorId);

        var connectionClient = req.accept('client', req.origin);

        //MAKE SURE DATA DIRECTORY EXISTS FOR SENSOR
        checkDirectoryExistsSync(getLiveDataDir(sensorId));

        //look for latest files and stream data
        var filenameSensor = getLiveDataFilename(sensorId);
        writeLogAndConsole("log_","Read live data from "+filenameSensor);

        var tailfd = streamFile(filenameSensor, connectionClient);

        var w = fs.watch(getLiveDataDir(sensorId), { encoding: 'utf8' }, (eventType, filename) => {

          if (eventType=='rename') {
            //we don't care about the specific file
            //we are interested in having a new file event
            //that may be (or not) a new sensor data file
            newFile = getLiveDataFilename(sensorId);

            //if different, then we should update the sensor
            //file to get new data
            if (filenameSensor !== newFile) {

              //if (tailfd) tailfd.unwatch();
              //if (tailfd) tailfd.close();

              filenameSensor = newFile;
              tailfd = streamFile(filenameSensor, connectionClient);

              writeLogAndConsole("log_","UPDATED FILE is "+filename+" - Read live data from "+filenameSensor);            
            }
          }
        });

        connectionClient.on('close', function(reasonCode, description) {
          w.close();
          //if (tailfd) tailfd.unwatch();
          writeLogAndConsole("log_", "client: connection.on close "+reasonCode +" "+ description);
        });
        connectionClient.on('error', function(err) {
          writeLogAndConsole("log_", "client: connection.on error "+err);
        });

      }

    } //if client
    
    else if (req.requestedProtocols[0] === "sensor") {

      //TODO: check if sensor is active
      //then see if should accept connection
      
      //get id 
      var sensorData;
      try {
        sensorData=JSON.parse(req.httpRequest.headers['user-agent']);
        if (typeof sensorData == "undefined") {    
          writeLogAndConsole("log_","Cannot retrieve sensor_id information.")
          rejectRequest(req);
        }
      }
      catch (e) {        
        writeLogAndConsole("log_","Malformed JSON from headers: "+req.httpRequest.headers['user-agent'])
        rejectRequest(req);
        return;
      }
      try {
        sensorDB.read(sensorData['sensor_id'])
        .then( sensor_db => {
          if (typeof sensor_db === 'undefined') {
            writeLogAndConsole("log_","Sensor is not known in DB: "+sensorData['sensor_id'])
            rejectRequest(req);
            return;
          } 
          else {
            sensorDBMap[sensorData['sensor_id']]=sensor_db;
            try {
              fillSensorInfoMap(sensorData);
              var sensor=sensorInfoMap[sensorData['sensor_id']];
              writeLogAndConsole("log_","Received connection request from sensor="+sensor.sensorid
                                 +" with operation parameters f="+sensor.frequency
                                 +" range="+sensor.range
                                 +" conversion_range="+sensor.conversion_range);
              certificates.isActive(sensor.sensorid)
              .then(status => {

                if (status==1) {
                  //writeLogAndConsole("log_","certificates.isActive on "+sensorkey+" gave "+status);
                  writeLogAndConsole("log_","Certificate exists and is active.")

                  //accept connection
                  writeLogAndConsole("log_", "wsserver.on request - accept connection from "+req.resource+" address: "+req.remoteAddress + " protocol: "+req.requestedProtocols); 

                  var connection = req.accept(req.requestedProtocols[0], req.origin);

                  //get sensor ID
                  var sensorId = req.resource.replace('/','');
                  connection.on('message', function(message) {
                    
                    mqttPublishSensorInfoMessage(sensorId);

                    //writeLogAndConsole("-- received: "+message);
                    if (message.type === 'utf8') {

                      //console.log("Received UTF8 Message of " + message.utf8Data.length + " bytes");
                      //console.log(message.utf8Data);

                      //HACK:  read data and reconvert to 1g scale
                      try {
                        if (sensor_conversion_range==1) {
                          writeSensorData(sensorId, message.utf8Data);
                        }
                        else {
                          var sensor_conversion_range = sensorInfoMap[sensorId].conversion_range; 
                          measurement=JSON.parse(message.utf8Data);
                          measurement['accel_x'] = Number(measurement['accel_x'])/sensor_conversion_range;
                          measurement['accel_y'] = Number(measurement['accel_y'])/sensor_conversion_range;
                          measurement['accel_z'] = Number(measurement['accel_z'])/sensor_conversion_range;
                          writeSensorData(sensorId, JSON.stringify(measurement));
                          addCalibrationValue(sensorId, 
                            measurement['accel_x'],
                            measurement['accel_y'],
                            measurement['accel_z']);
                          calculateCalibrationValues(sensorId);
                        }                
                      }
                      catch (e) {
                        writeLogAndConsole("log_","Malformed JSON from sensor data: "+message.utf8Data)
                        rejectRequest(req);
                        return;
                      } 
                    }
                    else if (message.type === 'binary') {
                      
                      //console.log("Sensor: "+sensorId+" Received Binary Message of " + message.binaryData.length + " bytes");
                      //console.log("---- got: "+message.binaryData);
                      //console.log("---- got: "+message.binaryData.toString());
                      
                      if ( message.binaryData.length < MESSAGE_BINARY_LENGTH ) {
                        writeLogAndConsole("log_", "Error in message length: "+message.binaryData.length);
                      }
                      else {
                        messageArray = message.binaryData.toString().split(' ');
                        if (messageArray.length < 5) {
                          writeLogAndConsole("log_", "Error in message contents - number of fields is :"+messageArray.length);
                        }
                        else {
                          var sensor_conversion_range = sensorInfoMap[sensorId].conversion_range; 
                          let measurement = {
                            sensor_id:      sensorId,
                            time_epoch_sec: Number(messageArray[0]),
                            time_micro:     Number(messageArray[1]),
                            accel_x:        Number(messageArray[2])/sensor_conversion_range,
                            accel_y:        Number(messageArray[3])/sensor_conversion_range,
                            accel_z:        Number(messageArray[4])/sensor_conversion_range
                          };
                          writeSensorData(sensorId, JSON.stringify(measurement));
                          addCalibrationValue(sensorId, 
                            measurement['accel_x'],
                            measurement['accel_y'],
                            measurement['accel_z']);
                          calculateCalibrationValues(sensorId);
                        }

                      }
                    }
                    else {
                      console.log("Discarded message from "+sensorId);
                    }
                  });
                  connection.on('close', function(reasonCode, description) {
                    writeLogAndConsole("log_", "connection.on close "+reasonCode +" "+ description);      
                  });
                  connection.on('error', function(err) {
                    writeLogAndConsole("log_", "connection.on error "+err);
                  });
                }//if status (is Active)
                else {
                  writeLogAndConsole("log_","Certificate does not exist or is NOT active.")
                  rejectRequest(req)
                }
            }); //certificates.isActive.then

            } //try
            catch(err) {
              writeLogAndConsole("log_","Error processing certificates - reject");
              rejectRequest(req);
            }    

          }
        });//end sensorDB.read
      }    
      catch (e) {        
        writeLogAndConsole("log_","Sensor is not known in DB: "+sensor.sensorid)
        rejectRequest(req);
        return;
      }

    }//if protocol sensor
    
    else {
      writeLogAndConsole("log_","Error processing connection - reject");
      rejectRequest(req);
    }
  
  });//wsserver.on request

  wsserver.on('close', function(conn, reason, description) {
    writeLogAndConsole("log_", "wsserver.on close "+reason +" "+ description);
  });

  wsserver.on('error', function(err) {
    writeLogAndConsole("log_", "wsserver.on error "+error); 
  });

} //end else !master

module.exports= wsserver;
