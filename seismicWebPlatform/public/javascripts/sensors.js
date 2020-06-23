//
//
//
//

/* 
 * VARS 
 *

  sensorMap is indexed per sensorid and stores sensor data in JSON format

  sensor data in array is initialised as follows:
  {
    "sensorid": "4222973344b945d0b4918fd919dae63a", 
    "latitude": 38,
    "longitude": -7,
    "elevation": 0,
    "last_update_sec": 0,  
  }

  MQTT status messages are JSON formatted as:
  {
    "sensorid": "4222973344b945d0b4918fd919dae63a", 
    "frequency": 100,
    "range": 2,
    "conversion_range": 1,
    "last_update_sec": 1583165821,
   }

  MQTT event messages are JSON formatted as:
  {
    "sensorid": "4222973344b945d0b4918fd919dae63a", 
    "magnitude_accel_rms": 2.4
    "max_accel_x": 0,
    "max_accel_y": 0,
    "max_accel_z": 2.4,
    "start_time_epoch_sec": 1583165821, 
    "start_time_micro": 555000, 
    "end_time_epoch_sec": 1583165822, 
    "end_time_micro": 555000, 
   }

 */

var sensorMap[];
var sensorMarkerMap[];

var SSN_MODEL = "SSN";

function addSensorToMap() {
  
}

function addMarker(sensorkey, name, model, latitude, longitude) {

  if ( model.indexOf(SSN_MODEL) !== -1 ) {
    var options = { 
      radius: CIRCLE_RADIUS_DEFAULT, 
      fill: true, 
      fillColor: "#aaaaaa",
      fillOpacity: 0.5 };
      // color : #aaaaaa
      // weight: 3
      // opacity: 1.0
      // fill:  true
      // fillColor: #aaaaaa
      // fillOpacity: 1.0
    var marker = new L.circleMarker([latitude, longitude], options)
        .addTo(mymap)
        .bindPopup(
          "<span STYLE='font-size: 12pt'><b>"+name
          +"</b></span><br/>\
          <b>Location:</b> LatLng ("+latitude+","+longitude
          +")<br/><b>Model: </b>"+model
          +"<br/><a href='/sensors/view/"+sensorkey
          +"' target='_top'> Click for details</a></br>");
    sensorMarkerMap[sensorkey]=marker;
  }
  else {
    var marker = new L.marker([latitude, longitude])
        .addTo(mymap);
    sensorMarkerMap[sensorkey]=marker;
  }

}

function updateMap (msg) {

  //new sensor event received - 
  // check if sensor exists. If so, draw it  
  if (sensorMarkerMap.hasOwnProperty(msg.properties.id)) {
    markerSensor = trackMap[track_msg.properties.id];
    markerSensor.options.radius=10;
    markerSensor.options.color="#FF0000";
  }
}

