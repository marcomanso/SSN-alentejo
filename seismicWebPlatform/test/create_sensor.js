var request = require('request');

//SERVER_IP = "192.168.0.103";
//SERVER_IP = "192.168.0.65";
SERVER_IP = "localhost";
SERVER_PORT = 3000;
SERVER_PORT_WS = 3030;

if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + " Server IP address");
  process.exit(-1);
}

SERVER_IP = process.argv[2];

//
// LG 4X 
//
request.post({
  url: "http://"+SERVER_IP+":"+SERVER_PORT+"/sensors/addsensor",
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sensorkey: "sensor_phone0006",
    name: "sensor_phone0006",
    description: "Accelerometer data taken from smartphone LG 4X.",
    latitude: 38.74488,
    longitude: -9.20045,
    elevation: 0.0,
    model: "LG 4X P880",
    model_URL: "https://www.gsmarena.com/lg_optimus_4x_hd_p880-4563.php",
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


//
// WIKO 
//
request.post({
  url: "http://"+SERVER_IP+":"+SERVER_PORT+"/sensors/addsensor",
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sensorkey: "sensor_phone0007",
    name: "sensor_phone0007",
    description: "Ufeel Lite offers a fresh mix of materials combining a metal frame, metal finish on the back cover and strong colours contrasts. A punchy premium design that won’t get unnoticed but that you can make safe… Ufeel Lite brings a unique feature: a multifunctional fingerprint sensor, to launch applications, access sensitive content… and more. It will also be the perfect ally for any multimedia activities, as well as beautiful pictures thanks to an 8MP camera.",
    latitude: 38.74488,
    longitude: -9.20045,
    elevation: 0.0,
    model: "WIKO U FEEL LITE",
    model_URL: "http://world.wikomobile.com/m1154-u-feel-lite",
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

//
// MPU-6050
//
request.post({
  url: "http://"+SERVER_IP+":"+SERVER_PORT+"/sensors/addsensor",
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sensorkey: "sensor_esp0004",
    name: "sensor_esp0004",
    description: "The MPU-6050 devices combine a 3-axis gyroscope and a 3-axis accelerometer on the same silicon die, together with an onboard Digital Motion Processor (DMP), which processes complex 6-axis MotionFusion algorithms. The device can access external magnetometers or other sensors through an auxiliary master I2C bus, allowing the devices to gather a full set of sensor data without intervention from the system processor. The devices are offered in a 4 mm x 4 mm x 0.9 mm QFN package.",
    latitude: 38.74488,
    longitude: -9.20045,
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

