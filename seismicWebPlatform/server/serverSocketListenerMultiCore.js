/**
* using WebSocket-Node
*/


var http = require('http'),
    fs = require('fs'),
    //Tail = require('tail').Tail,
    Tail = require('tail-stream'),
    url = require('url'),
    nodeRSA = require('node-rsa'),
    //crypto = require('crypto');
    WebSocketServer = require('websocket').server;

var rsa = new nodeRSA();
rsa.setOptions({signingScheme: 'pss-sha1'});

http.globalAgent.maxSockets = Infinity;

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var certificates = require('../models/certificates-sqlite')

var utils = require('../utils/utils.js');
var dataUtils = require('../utils/datautils.js');
var debug = require('debug')('seismic:server');

var MESSAGE_AUTH = process.env.MESSAGE_AUTH || "sensor"

var MESSAGE_BINARY_LENGTH = 20; // 20 = 5 values (each has 4bytes=32bits)

// DEFAULTS
var DEF_SENSOR_FREQUENCY = 100;
var DEF_SENSOR_RANGE_G   = 2;
var DEF_CONVERSION_RAGE  = 1;

// process.env.SENSOR_EVENT_THRESHOLD 1g?

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

    /*  Tail
    tailfd = new Tail(filename, "\n", {  }, true);
    tailfd.on("line", data => {
      
      console.log("data: "+data);
      
      clientWS.send(data);
    });
    tailfd.on("error", error => {
      writeLogAndConsole("log_", error);
    });
    */
  }
  catch(err) { writeLogAndConsole("log_", err); };
  
  return tailfd;
}


function rejectRequest(req) {
  writeLogAndConsole("log_", "wsserver.on request - from sensor " + req.remoteAddress + " connection rejected ");
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
      var sensorID = req.resource;

      if (!sensorID) {
        var connectionClient = req.reject();
        writeLogAndConsole("log_", "client: wsserver.on request - from client " + req.remoteAddress + " cannot find sensor "+sensorID);
      }
      else {
        writeLogAndConsole("log_", "client: wsserver.on request - accept connection from "+req.remoteAddress + " protocol: "+req.requestedProtocols+" for sensor "+sensorID);

        var connectionClient = req.accept('client', req.origin);

        //MAKE SURE DATA DIRECTORY EXISTS FOR SENSOR
        checkDirectoryExistsSync(getLiveDataDir(sensorID));

        //look for latest files and stream data
        var filenameSensor = getLiveDataFilename(sensorID);
        writeLogAndConsole("log_","Read live data from "+filenameSensor);

        var tailfd = streamFile(filenameSensor, connectionClient);

        var w = fs.watch(getLiveDataDir(sensorID), { encoding: 'utf8' }, (eventType, filename) => {

          if (eventType=='rename') {
            //we don't care about the specific file
            //we are interested in having a new file event
            //that may be (or not) a new sensor data file
            newFile = getLiveDataFilename(sensorID);

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
      
      var sensorkey;
      var sensor_frequency;
      var sensor_range_g;
      var sensor_conversion_range;
      
      //get id 
      try {
        var sensorData=JSON.parse(req.httpRequest.headers['user-agent']);
        if (typeof sensorData == "undefined") {    
          writeLogAndConsole("log_","Cannot retrieve sensor_id information.")
          rejectRequest(req);
        }
        sensorkey=sensorData['sensor_id'];
        sensor_frequency=1000.0/parseFloat(sensorData['period_ms']);
        if (isNaN(sensor_frequency)) {
          sensor_frequency = DEF_SENSOR_FREQUENCY;
        }
        sensor_range_g=parseFloat(sensorData['max_range']);
        if (isNaN(sensor_range_g)) {
          sensor_range_g = DEF_SENSOR_RANGE_G;
        }
        sensor_conversion_range=parseFloat(sensorData['conversion_scale_1g']);
        if (isNaN(sensor_conversion_range)) {
          sensor_conversion_range = DEF_CONVERSION_RAGE;
        }
        
        //for now do not use certificates //msg_signed_b64=decodeURIComponent(req.httpRequest.headers['x-custom']);

      }
      catch (e) {        
        writeLogAndConsole("log_","Malformed JSON from headers: "+req.httpRequest.headers['user-agent'])
        rejectRequest(req);
        return;
      }
     
      try {
                         
        writeLogAndConsole("log_","Received connection request from sensor="+sensorkey
                           +" with operation parameters f="+sensor_frequency
                           +" range="+sensor_range_g
                           +" conversion_range="+sensor_conversion_range);

        certificates.isActive(sensorkey)
        .then(status => {

        if (status==1) {
          //writeLogAndConsole("log_","certificates.isActive on "+sensorkey+" gave "+status);
          writeLogAndConsole("log_","Certificate exists and is active.")

          //accept connection
          writeLogAndConsole("log_", "wsserver.on request - accept connection from "+req.resource+" address: "+req.remoteAddress + " protocol: "+req.requestedProtocols); 

          var connection = req.accept(req.requestedProtocols[0], req.origin);

          //get sensor ID
          var sensorID = req.resource;
          connection.on('message', function(message) {
            
            //writeLogAndConsole("-- received: "+message);
            if (message.type === 'utf8') {

              //console.log("Received UTF8 Message of " + message.utf8Data.length + " bytes");
              //console.log(message.utf8Data);

              //HACK:  read data and reconvert to 1g scale
              try {
                if (sensor_conversion_range==1) {
                  writeSensorData(sensorID, message.utf8Data);
                }
                else {
                  measurement=JSON.parse(message.utf8Data);
                  measurement['accel_x'] = Number(measurement['accel_x'])/sensor_conversion_range;
                  measurement['accel_y'] = Number(measurement['accel_y'])/sensor_conversion_range;
                  measurement['accel_z'] = Number(measurement['accel_z'])/sensor_conversion_range;
                  writeSensorData(sensorID, JSON.stringify(measurement));
                }                
              }
              catch (e) {
                writeLogAndConsole("log_","Malformed JSON from sensor data: "+message.utf8Data)
                rejectRequest(req);
                return;
              } 
            }
            else if (message.type === 'binary') {
              
              console.log("Sensor: "+sensorID+" Received Binary Message of " + message.binaryData.length + " bytes");
              console.log("---- got: "+message.binaryData);
              console.log("---- got: "+message.binaryData.toString());
              
              /*
              Received Binary Message of 35 bytes
                ---- got: 1583082116 793000 9965 26486 255004
                  ---- got: 1583082116 793000 9965 26486 255004
              Received Binary Message of 36 bytes
                ---- got: 1583082116 801000 10632 26610 256541
                  ---- got: 1583082116 801000 10632 26610 256541
              Received Binary Message of 36 bytes
                ---- got: 1583082116 809000 12463 26017 256756
                  ---- got: 1583082116 809000 12463 26017 256756
              Received Binary Message of 36 bytes
                ---- got: 1583082116 817000 12705 25140 256781
                  ---- got: 1583082116 817000 12705 25140 256781
              */
              
              if ( message.binaryData.length < MESSAGE_BINARY_LENGTH ) {
                writeLogAndConsole("log_", "Error in message length: "+message.binaryData.length);
              }
              else {
                messageArray = message.binaryData.toString().split(' ');
                if (messageArray.length < 5) {
                  writeLogAndConsole("log_", "Error in message contents - number of fields is :"+messageArray.length);
                }
                else {
                  let measure = {
                    time_epoch_sec: messageArray[0],
                    time_micro:     messageArray[1],
                    accel_x:        Number(messageArray[2])/sensor_conversion_range,
                    accel_y:        Number(messageArray[3])/sensor_conversion_range,
                    accel_z:        Number(messageArray[4])/sensor_conversion_range
                  };
                  console.log(JSON.stringify(measure));
                  //writeSensorData(sensorID, JSON.stringify(measurement));
                }
                
                /*
                "{ \"sensorid\": \"%s\", 
                \"time_epoch_sec\": %lu, 
                \"time_micro\": %lu, 
                \"accel_x\": %d, 
                \"accel_y\": %d, 
                \"accel_z\": %d }",
                */

                
                
                /*
                1  5  8  3  0  ...  
                
                <Buffer 
                31 35 38 33 30 38 30 36 37 37 
                20 
                35 38 36 30 30 30 
                20 
                33 39 39 35 
                20 
                32 32 34 34 36 
                20 
                32 35 37 32 39 36>              
                
                  Received Binary Message of 37 bytes
                  <Buffer 
                31 35 38 33 30 38 30 37 36 34 
                20 
                37 36 39 30 30 30 
                20 
                2d 32 30 38 35 37 
                20 
                31 31 39 32 33 
                20 
                32 35 30 32 30 33>

                  
                var time_epoch = message.binaryData.readUInt32BE(0);
                var time_micro = message.binaryData.readUInt32BE(4);
                var a_x = message.binaryData.readInt32BE(8);
                var a_y = message.binaryData.readInt32BE(12);
                var a_z = message.binaryData.readInt32BE(16);
                
                console.log("---- got: "+time_epoch+" "+time_micro+" "+a_x+" "+a_y+" "+a_z);
                */
                
              }
              
        
              /*
              var data = message.binaryData;
              var len = data.length;              
              
              var buf = new Buffer(len);
              var arr = new Int32Array(buf);
              for (var i = 0; i < len; i+=4 ) {
                var r = data.readUInt8(i);
                var g = data.readUInt8(i+1);
                var b = data.readUInt8(i+2);
                var y = Math.floor((77*r + 28*g + 151*b)/255);
                var v = y + (y << 8) + (y << 16) + (0xFF << 24);
                buf.writeInt32LE(v, i);
                
              }
              */
              
            }
            else {
              console.log("Discarded message from "+sensorID);
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
