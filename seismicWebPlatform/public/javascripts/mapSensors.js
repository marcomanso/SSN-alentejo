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

function addSensorFieldsToMap(sensorid, name, latitude, longitude, elevation, sensor_URL, data_URL, last_update_sec) {
  let sensor = {
    "sensorid":   sensorid,
    "name":       name, 
    "latitude":   latitude,
    "longitude":  longitude,
    "elevation":  elevation,
    "sensor_URL": sensor_URL,
    "data_URL":   data_URL,
    "last_update_sec": last_update_sec
  };
  sensorMap.set(sensorid, sensor);

}

function addSensorToMap(sensor) {
  //OK to overwrite if exists
  let s = {
    "sensorid":   sensor.sensorid,
    "name":       sensor.name, 
    "latitude":   sensor.latitude,
    "longitude":  sensor.longitude,
    "elevation":  sensor.elevation,
    "sensor_URL": sensor.sensor_URL,
    "data_URL":   sensor.data_URL,
    //
    "frequency":  sensor.frequency,
    "range":      sensor.range,
    "conversion_range":  sensor.conversion_range,
    "last_update_sec":   sensor.last_update_sec,
    "last_update_micro": 0
  };
  sensorMap.set(sensor.sensorid, s);
}

function addMarkerToMap(sensor) {

  //radius proportional to zoom ?
  //console.log("--zoom is: "+mymap.getZoom());

  var options = { 
    radius:     CIRCLE_RADIUS_DEFAULT, 
    stroke:     true,
    color:      STATUS_COLOR_UNKNOWN,
    fill:       true, 
    fillColor:  STATUS_COLOR_UNKNOWN,
    fillOpacity: 0.3 };
    // color : #aaaaaa
    // weight: 3
    // opacity: 1.0
    // fill:  true
    // fillColor: #aaaaaa
    // fillOpacity: 1.0
  var marker = new L.circleMarker([sensor.latitude, sensor.longitude, sensor.elevation], options)
  .addTo(mymap)
  .bindPopup(
    "<span STYLE='font-size: 12pt'><b>"+sensor.name
    +"</b></span><span class=\"badge badge-pill badge-dark\">"+sensor.sensorid
    +"</span><br/><b>Location:</b><br/> "
    +"Latitude: "+sensor.latitude
    +"<br/>Longitude: "+sensor.longitude
    +"<br/>Elevation: "+sensor.elevation
    +"<br/>URL: <a href='"+sensor.sensor_URL+"/sensors/view/"+sensor.sensorid
    +"' target='_top'>"+sensor.sensor_URL+"</a><br/>");
  sensorMarkerMap.set(sensor.sensorid, marker);
}

function sensorTimerProcessing() {

  //console.log("sensorTimerProcessing");

  sensorMap.forEach( function(sensor) {
    var d = new Date();
    if (isConnectedSensor(sensor))
      if ( (d.getTime() - 1000*sensor.last_update_sec)>TIME_INACTIVE_MS )
        setSensorAsInactive(sensor.sensorid);
      else 
        setSensorAsActive(sensor.sensorid);      
  });
}

function isConnectedSensor(sensor) {
  //only if is a connected sensor 
  //- we infer this by inspecting if "conversion_range" exists
  if (typeof sensor.conversion_range !== 'undefined' )
    return true;
  else
    return false;
}

function setSensorAsInactive(sensorid) {
  marker=sensorMarkerMap.get(sensorid);
  marker.setStyle({
    color: STATUS_COLOR_INACTIVE,
    fillColor: STATUS_COLOR_INACTIVE});
}

function setSensorAsActive(sensorid) {
  marker=sensorMarkerMap.get(sensorid);
  marker.setStyle({
    color: STATUS_COLOR_ACTIVE,
    fillColor: STATUS_COLOR_ACTIVE});  
}

function newSensorEventMessage(sensorevent_msg) {
  console.log("newSensorMessage"+msg);

}

function newSensorInfoMessage(sensorinfo_msg) {

  //add to map - no prob with overwrite
  var sensor = JSON.parse(sensorinfo_msg);
  addSensorToMap(sensor);
  var sensorMarker = sensorMarkerMap.get(sensor.sensorid);
  //check if has marker - if not, create
  if (typeof sensorMarker === 'undefined') {
    console.log("-- new sensor (not in DB) discovered: "+sensor.sensorid);
    addMarkerToMap(sensor);
  }
  else {
    //todo??? update lat-lon?
    if ( sensor.latitude  != sensorMarker.getLatLng().lat 
      || sensor.longitude != sensorMarker.getLatLng().lng
      || sensor.elevation != sensorMarker.getLatLng().alt ) {
    console.log("-- updated location for sensor: "+sensor.sensorid);
    sensorMarker.setLatLng([sensor.latitude, sensor.longitude, sensor.altitude]);      
    }
  }
  setSensorAsActive(sensor.sensorid);

  //update location ??????
  //track.slideTo(msg.geometry.coordinates, {
  //  duration: 1000,
  //  keepAtCenter: false
  //});    
}

function newSensorMessage(topic, msg) {

  //console.log("newSensorMessage"+msg+" on topic "+topic);

  if (topic.endsWith(MQTT_TOPIC_SUB_INFO)) {
    newSensorInfoMessage(msg);
  }
  else if (topic.endsWith(MQTT_TOPIC_SUB_EVENT)) {
    newSensorEventMessage(msg);
  }
  else { 
    //unknown
  }

}

