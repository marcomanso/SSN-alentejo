/**
* using WebSocket-Node
*/

var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    WebSocketServer = require('websocket').server;

var utils = require('../utils/utils.js');

var debug = require('debug')('seismic:server');

var sensorSubscribedClients = {};


//
// FILES AND LOGS
//

//TODO - organise by year, month - compress
var basePath = 'public/'+(process.env.SENSOR_DATA_FILE_DIR || 'data');

if (!fs.existsSync(basePath)){
  fs.mkdirSync(basePath);
}

function writeLog(name, message) {

  fs.appendFile(basePath+"/"+name+"_"+utils.getDateTime_In_YYYYMMDD_HH(new Date())+'.txt', message+'\n', function (err) {
    if (err) console.log('Error: '+err);
  });
}
function writeLogAndConsole(name, message) {

  console.log(message); //remove in production environment

  fs.appendFile(basePath+"/"+name+"_"+utils.getDateTime_In_YYYYMMDD_HH(new Date())+'.txt', message+'\n', function (err) {
    if (err) console.log('Error: '+err);
  });
}

//
// UTILS, MESSAGE PARSE
//

function getClientId (clientUrl) {
  var clientId = url.parse(clientUrl).pathname;
  clientId = clientId.substring(clientId.lastIndexOf('/') + 1);
  if (!clientId) clientId = "client_undefined";
  return clientId;
}


//
// CONNECTIONS LIST
//

function addConnectionClient(sensorId, connectionClient) {
  sensorSubscribedClients[sensorId].push(connectionClient);
  showConnections();
}
function removeConnectionClient(sensorId, connectionClient) {

  if (sensorSubscribedClients[sensorId] != undefined) {
    sensorSubscribedClients[sensorId].splice(connectionClient, 1);
  }
  showConnections();
}
function removeConnectionClient(connectionClient) {

  for (key in sensorSubscribedClients) {
    sensorSubscribedClients[key].splice(connectionClient, 1);
  }
  showConnections();
}
function sendSensorDataToConnectedClients(sensorId, message) {
  if (sensorSubscribedClients[sensorId] != undefined)
    sensorSubscribedClients[sensorId].forEach(
      function(conn) {
        if (typeof conn !== "undefined" && conn.readyState === conn.OPEN) {
          conn.send(message);                    
        }
      });
}
function closeAllSensorConnectedClients(sensorId) {
  sensorSubscribedClients[sensorId].forEach(function(conn) {
    if (typeof conn !== "undefined" && conn.readyState === conn.OPEN) {
      conn.close(1001, "Sensor disconnected");
    }
  });
  showConnections();
}
function showConnections() {
  for (key in sensorSubscribedClients) {
    console.log(key+" has "+sensorSubscribedClients[key].length+ " client(s)");
  }
}

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
                keepalive:true, 
                keepaliveInterval:15000, 
                keepaliveGracePeriod:15000, 
                closeTimeout:0 });

writeLogAndConsole("log_","Server started at "+utils.getDateTime_InYYYYMMDD_HHMMSS(new Date()));

wsserver.on('request', function(req) {

  if (req.requestedProtocols[0] === "client") {

    writeLogAndConsole("log_", "client: wsserver.on request - accept connection from "+req.remoteAddress + " protocol: "+req.requestedProtocols);

    //get requested sensor ID
    sensorID = req.resource;
    //exists?
    if ( sensorSubscribedClients[sensorID] === undefined ) {
      writeLogAndConsole("log_", "client: wsserver.on request - from client " + req.remoteAddress + " cannot find sensor "+sensorID);
      req.reject();
    } else {
      connectionClient = req.accept('client', req.origin);
      addConnectionClient(sensorID, connectionClient);

      /*
           connectionClient.on('message', function(message) {
               if (message.type === 'utf8') {
                    //writeLog(req.resource, message.utf8Data);
                    //POSSIBLE USE OF JSON
                    //key, data
                    //var jsonMessage = JSON.parse(message.utf8Data);
                    //if ("id" in jsonMessage)
                    //	writeLog(jsonMessage.id, message.utf8Data);
                    //else
                        //    writeLog("unknown", message.utf8Data);
                }
                else if (message.type === 'binary') {
                    console.log(message.binaryData);
                }
            });
            */
      connectionClient.on('close', function(reasonCode, description) {
        writeLogAndConsole("log_", "client: connection.on close "+reasonCode +" "+ description);
        removeConnectionClient(req.resource,connectionClient);
        //removeConnectionClient(connectionClient);
        connectionClient = void 0;
      });
      connectionClient.on('error', function(err) {
        writeLogAndConsole("log_", "client: connection.on error "+err);
        removeConnectionClient(req.resource,connectionClient);
        //removeConnectionClient(connectionClient);
      });
    }  
  }
  //else {  //if (req.requestedProtocols[0] === "arduino") {
  else if (req.requestedProtocols[0] === "sensor") {

    writeLogAndConsole("log_", "wsserver.on request - accept connection from "+req.resource+" address: "+req.remoteAddress + " protocol: "+req.requestedProtocols);    

    //var connection = req.accept('arduino', req.origin);
    var connection = req.accept(req.requestedProtocols[0], req.origin);

    //get sensor ID
    sensorID = req.resource;

    //add to list of sensors (new connection is always empty list)
    sensorSubscribedClients[sensorID]=[];

    //console.log( require('util').inspect(sensorSubscribedClients) );       

    connection.on('message', function(message) {

      //get sensor ID
      sensorID = req.resource;

      //console.log( require('util').inspect(connection) );       
      //console.log("data from "+sensorID);

      if (message.type === 'utf8') {
        writeLog(sensorID, message.utf8Data);

        //send data to connected clients
        sendSensorDataToConnectedClients(sensorID, message.utf8Data);

      }
      //else if (message.type === 'binary') {
      //    console.log(message.binaryData);
      //}
      else {
        console.log("Discarded message from "+sensorID);
      }
    });
    connection.on('close', function(reasonCode, description) {
      writeLogAndConsole("log_", "connection.on close "+reasonCode +" "+ description);

      //closeAllSensorConnectedClients(req.resource);

      //sensorSubscribedClients.splice(sensorID,1);

      //sensorSubscribedClients[sensorID]=[];

      //console.log( require('util').inspect(sensorSubscribedClients) ); 
    });
    connection.on('error', function(err) {
      writeLogAndConsole("log_", "connection.on error "+err);
    });
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

module.exports= wsserver;


