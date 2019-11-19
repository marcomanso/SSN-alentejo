/**
* using WebSocket-Node
*/

var http = require('http'),
    fs = require('fs'),
    //Tail = require('tail').Tail,
    Tail = require('tail-stream'),
    url = require('url'),
    WebSocketServer = require('websocket').server;

http.globalAgent.maxSockets = Infinity;

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var utils = require('../utils/utils.js');
var debug = require('debug')('seismic:server');



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

function writeLog(name, message) {
  var sensorPath = basePath + "/" + name;
  checkDirectoryExistsSync(sensorPath);
  fs.appendFile(sensorPath+"/"+name+"_"+utils.getDateTime_In_YYYYMMDD_HH(new Date())+'.txt', message+'\n', function (err) {
    if (err) console.log('Error: '+err);
  });
}
function writeLogAndConsole(name, message) {
  console.log(message); //remove in production environment
  writeLog(name, message);
}

function getLiveDataFilename(name) {
  return basePath + "/" + name + "/" + name + "_"+utils.getDateTime_In_YYYYMMDD_HH(new Date())+'.txt';                
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

    if (req.requestedProtocols[0] === "sensor") {

      writeLogAndConsole("log_", "wsserver.on request - accept connection from "+req.resource+" address: "+req.remoteAddress + " protocol: "+req.requestedProtocols);    

      //var connection = req.accept('arduino', req.origin);
      var connection = req.accept(req.requestedProtocols[0], req.origin);

      //get sensor ID
      var sensorID = req.resource;
      connection.on('message', function(message) {
        if (message.type === 'utf8') {
          writeLog(sensorID, message.utf8Data);
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
    }
    else if (req.requestedProtocols[0] === "client") {

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

    }
    else {
      writeLogAndConsole("log_", "wsserver.on request - from sensor " + req.remoteAddress + " rejected protocol "+req.requestedProtocols);
      req.reject();
    }

  });

  wsserver.on('close', function(conn, reason, description) {
    writeLogAndConsole("log_", "wsserver.on close "+reason +" "+ description);
  });

  wsserver.on('error', function(err) {
    writeLogAndConsole("log_", "wsserver.on error "+error); 
  });

} //end else !master

module.exports= wsserver;
