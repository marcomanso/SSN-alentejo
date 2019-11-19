// Create a client instance
MQTT_HOSTNAME = "163.172.128.173"
MQTT_PORT = 1884
MQTT_CLIENT_ID = "webClientId"+ Math.random().toString(16).substr(2, 8)

MQTT_TOPIC_SUB = "sensors/#"

client = new Paho.MQTT.Client(MQTT_HOSTNAME, MQTT_PORT, MQTT_CLIENT_ID);

options = {
  onSuccess:onConnect, 
  onFailure: onFail,
  timeout: 5,
  cleanSession: true,
  reconnect: true
};

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

function init() {
  // connect the client
  client.connect(options);
  //client.connect(options);
  console.log("init");
}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe(MQTT_TOPIC_SUB);
  //message = new Paho.MQTT.Message("Hello");
  //message.destinationName = "World";
  //client.send(message);
}

// called when the client connects
function onFail() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onFail");
  
  //retry
  //init();
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
    
    //retry
    //init();
  }
}

// called when a message arrives
function onMessageArrived(message) {
  msg = JSON.parse(message.payloadString);

  console.log(message.payloadString);
  
  updateMap(msg);
  
  //document.getElementById('msg').innerHTML = message.payloadString;

}
