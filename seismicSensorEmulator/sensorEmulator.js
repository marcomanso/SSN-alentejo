/**
* WebSocket Sensor emulator
*/


var nodeId = "sensor_dummy_00";

var serverIP = "localhost";
//var serverIP = "192.168.0.65";

var serverPort = "3030";
var serverProtocol = "sensor";
//var period_ms = 1000; // = 1Hz
//var period_ms = 100; // = 10Hz
var period_ms = 10; // = 100Hz

var timeSent = Date.now();
var timeSent_prev = 0;

var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();

const os = require('os');
//var utils = require('./utils.js');

function showSentPeriod() {

    timeSent_prev = timeSent;
    timeSent = Date.now();

    process.stdout.write("\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\bms="+(timeSent-timeSent_prev)+"        ");
}

//input parameters
switch (process.argv.length) {
    case 6:
        period_ms = parseInt(process.argv[5]); //subtract 1 due to overheads
    case 5:
        serverPort = process.argv[4];
    case 4: 
        serverIP = process.argv[3];
    case 3:
        nodeId = process.argv[2];
    default:
        break;
}

console.log("Usage: node-number serverIP serverPort period(ms)");
console.log("-- using node ID: " + nodeId + " @"+period_ms+"(ms) - connecting to "+serverIP+":"+serverPort);

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
    //process.abort();
    //process.kill(process.pid, 'SIGKILL');
});

client.on('connect', function(connection) {

    console.log('Client: WebSocket client connected');

    connection.on('error', function(error) {
        console.log(error);
        //process.abort();
        //process.kill(process.pid, 'SIGKILL');
    });

    connection.on('message', function(message) {
        switch (message.type) {
            case 'utf8':
                console.log('from server: ', message.utf8Data);
                break;
            default:
                console.log(JSON.stringify(message));
            break;
        }
	});

	var interval = setInterval ( function () {

	    var randX = os.loadavg()[0];
	    var randY = os.loadavg()[1];
	    var randZ = os.loadavg()[2];

            var milliseconds = (new Date).getTime();
            var t_epoch = parseInt(milliseconds / 1000,10);
            var nano = (milliseconds - t_epoch*1000)*1000;

            message = `{"sensorID":"${nodeId}",\
			"time_epoch_sec":"${t_epoch}",\
			"time_nano":"${nano}",
			"accel_x":"${randX}",
			"accel_y":"${randY}",
			"accel_z":"${randZ}"}`;
	    connection.send(message);

	    //showSentPeriod();
	    
	}, period_ms);

    connection.on('close', function() {
		clearInterval(interval);
        console.log('Connection Closed');
    });

});

client.connect('ws://'+serverIP+':'+serverPort+'/'+nodeId, serverProtocol);
