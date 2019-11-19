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

LAT_START = 38.535;
LON_START = -8.105;
SCALE_INCREMENT = 0.01;

function createSensor(id,lat,lon) {
  //
  // MPU-6050
  //
  request.post({
    url: "http://"+SERVER_IP+":"+SERVER_PORT+"/sensors/addsensor",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sensorkey: id,
      name: "sensor_"+id,
      description: "Ground motion sensor using the MPU-6050 3-axis gyroscope and a 3-axis accelerometer. The device is set to a 2g range.",
      latitude: lat,
      longitude: lon,
      elevation: 0.0,
      model: "MPU-6050",
      model_URL: "https://www.invensense.com/products/motion-tracking/6-axis/mpu-6050/",
      timecreated: new Date(),
      sensor_URL: "http://"+SERVER_IP+":"+SERVER_PORT,
      data_URL: "ws://"+SERVER_IP+":"+SERVER_PORT_WS
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

  lat = LAT_START + (i%10)*SCALE_INCREMENT ;
  lon = LON_START + parseInt(i/10)*SCALE_INCREMENT ;
  createSensor(i, lat, lon);
  
  i++;
}
