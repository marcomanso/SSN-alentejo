var request = require('request');

//SERVER_IP = "192.168.0.103";
//SERVER_IP = "192.168.0.65";
SERVER_IP = "localhost";
SERVER_PORT = 3000;
SERVER_PORT_WS = 3030;

if (process.argv.length <= 3) {
  console.log("Usage: " + __filename + " [server_IP] [nbr_sensors]");
  process.exit(-1);
}

SERVER_IP = process.argv[2];
NBR_SENSORS = process.argv[3];

function deleteSensor(id) {
  request.post({
    url: "http://"+SERVER_IP+":"+SERVER_PORT+"/sensors/deletesensor",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sensorkey: id
    })
  }, function(error, response, body){
    if (error) {
      console.log("Error: "+error.message);
    }
    console.log(""+body);
  });  
}

i=0;
while (i < parseInt(NBR_SENSORS,10)) {
  deleteSensor(i);
  i++;
}
