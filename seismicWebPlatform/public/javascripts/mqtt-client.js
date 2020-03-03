// Create a client instance

client = new Paho.MQTT.Client(MQTT_HOSTNAME, MQTT_PORT, MQTT_CLIENT_ID);

options = {
  onSuccess: mqtt_onConnect, 
  onFailure: mqtt_onFail,
  timeout: 5,
  cleanSession: true,
  reconnect: true
};

// set callback handlers
client.onConnectionLost = mqtt_onConnectionLost;
client.onMessageArrived = mqtt_onMessageArrived;

function mqtt_init() {
  // connect the client
  client.connect(options);
  console.log("init");
}

// called when the client connects
function mqtt_onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe(MQTT_TOPIC_SUB_MAIN);
  //message = new Paho.MQTT.Message("Hello");
  //message.destinationName = "World";
  //client.send(message);
}

// called when the client connects
function mqtt_onFail() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onFail");
  
  mqtt_init();

  //retry
  //init();
}

// called when the client loses its connection
function mqtt_onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject);
    
    //retry
    //init();
  }
}

// called when a message arrives
function mqtt_onMessageArrived(message) {

  topic = message.topic;
  msg   = message.payloadString;
  newSensorMessage(topic, msg);

}
