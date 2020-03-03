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


/* 
 * FUNCTIONS 
 *
 */

function addSensorToMap(sensorid, name, latitude, longitude, elevation, last_update_sec) {

  let sensor = {
    "sensorid":  sensorid,
    "name":      name, 
    "latitude":  latitude,
    "longitude": longitude,
    "elevation": elevation,
    "last_update_sec": last_update_sec
  };
  sensorMap.set(sensorid, sensor);

}

function addMarkerToMap(sensor) {
  var options = { 
    radius:     CIRCLE_RADIUS_DEFAULT, 
    stroke:     true,
    color:      STATUS_COLOR_STROKE,
    fill:       true, 
    fillColor:  STATUS_COLOR_UNKNOWN,
    fillOpacity: 0.5 };
    // color : #aaaaaa
    // weight: 3
    // opacity: 1.0
    // fill:  true
    // fillColor: #aaaaaa
    // fillOpacity: 1.0
  var marker = new L.circleMarker([sensor.latitude, sensor.longitude], options)
  .addTo(mymap)
  .bindPopup(
    "<span STYLE='font-size: 12pt'><b>"+sensor.name
    +"</b></span><br/>\
    <b>Location:</b> LatLng ("+sensor.latitude+","+sensor.longitude
    +")<br/><a href='/sensors/view/"+sensor.sensorkey
    +"' target='_top'> Click for details</a></br>");
  sensorMarkerMap.set(sensor.sensorkey, marker);
}


function getSensor(sensorid) {
  return sensorMap.get(sensorid);
}

function getMarker(sensorid) {
  return sensorMarkerMap.get(sensorid);
}

function newMessage(message) {
  console.log("newMessage received: "+JSON.stringify(message));
}

function newSensorEventMessage(sensor_msg) {

}

function newSensorInfoMessage(sensor_msg) {
  var sensor;
  if ( sensorMap.get(sensor_msg.sensorid) === 'undefined' ) {
    addSensorToMap(
      sensor_msg.sensorid, 
      sensor_msg.name, 
      sensor_msg.latitude, 
      sensor_msg.longitude, 
      sensor_msg.elevation, 
      sensor_msg.last_update_sec);
    addMarkerToMap(sensor_msg);
  }
  else {
    //update?
    marker=sensorMarkerMap.get(sensor_msg.sensorid);
    market.options.fillColor=STATUS_COLOR_ACTIVE;
  }

  //update location
  //track.slideTo(msg.geometry.coordinates, {
  //  duration: 1000,
  //  keepAtCenter: false
  //});    
}

