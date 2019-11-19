var request = require('request');

//SERVER_IP = "192.168.0.103";
SERVER_IP = "192.168.0.65";
SERVER_PORT = 3000;
SERVER_PORT_WS = 3030;

//
// MPU-6050
//
request.post({
  url: "http://"+SERVER_IP+":"+SERVER_PORT+"/sensors/addsensor",
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sensorkey: "sensor_esp0002",
    name: "sensor_esp0002",
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

