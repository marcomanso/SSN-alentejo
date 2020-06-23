// Create a client instance

client = new Paho.MQTT.Client(MQTT_HOSTNAME, MQTT_PORT, MQTT_CLIENT_ID);

options = {
  onSuccess: mqtt_onConnect, 
  onFailure: mqtt_onFail,
  timeout: 5,
  useSSL: false,
  cleanSession: true,
  reconnect: true
};

// set callback handlers
client.onConnectionLost = mqtt_onConnectionLost;
client.onMessageArrived = mqtt_onMessageArrived;

function mqtt_init() {
  // connect the client
  client.connect(options);
  console.log("mqtt_init");
  document.getElementById("alert_warning").style.display = "block";
}

// called when the client connects
function mqtt_onConnect() {
  console.log("mqtt_onConnect");
  client.subscribe(MQTT_TOPIC_SUB_MAIN);
  //message = new Paho.MQTT.Message("Hello");
  //message.destinationName = "World";
  //client.send(message);
  document.getElementById("alert_warning").style.display = "none";
  document.getElementById("alert_error").style.display = "none";
}

function mqtt_onFail() {
  console.log("mqtt_onFail");

  document.getElementById("alert_warning").style.display = "none";
  document.getElementById("alert_error").style.display = "block";
  
  //mqtt_init();

  //retry
  //init();
}

// called when the client loses its connection
function mqtt_onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("mqtt_onConnectionLost:"+responseObject);
    
  document.getElementById("alert_warning").style.display = "block";
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
