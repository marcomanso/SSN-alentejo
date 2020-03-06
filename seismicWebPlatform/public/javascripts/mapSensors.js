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


var sensorMap = new Map();
var sensorMarkerMap = new Map();
var sensorEventMap = new Map();
var MAX_SENSOR_EVENT_MAP_SIZE = 1024;

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
  if (!sensorIsMoving(sensorid)) {
    marker=sensorMarkerMap.get(sensorid);
    marker.setStyle({
      color: STATUS_COLOR_ACTIVE,
      fillColor: STATUS_COLOR_ACTIVE});  
  }
}

function setSensorAsMoving(sensorid, accel_value) {
  marker=sensorMarkerMap.get(sensorid);
  marker.setStyle({
    color: STATUS_COLOR_MOVING,
    fillColor: STATUS_COLOR_MOVING});  
}

function sensorIsMoving(sensorid) {
  if (typeof sensorEventMap.get(sensorevent_msg.sensorid) !== 'undefined') {
    let keys = sensorEventMap.get(sensorevent_msg.sensorid).keys();
    let last_record = sensorEventMap.get(sensorevent_msg.sensorid).get(keys[keys.length-1]);
    if (last_record.time_end_ms===0)
      return true;
  }
  return false;
}

function newSensorEventMessage(sensorevent_msg) {
  /*  
  eventData.sensorid
  eventData.time_start_ms =date.getTime(); //!=0 indicated ongoing event
  eventData.time_update_ms=date.getTime(); //!=0 indicated ongoing event
  eventData.time_end_ms   =0;
  eventData.max_accel_x   =average_x;
  eventData.max_accel_y   =average_y;
  eventData.max_accel_z   =average_z;
  eventData.d_accel_x     =average_x-sensorCalibrationMap.get(sensorid)[0];
  eventData.d_accel_y     =average_y-sensorCalibrationMap.get(sensorid)[1];
  eventData.d_accel_z     =average_z-sensorCalibrationMap.get(sensorid)[2];
  eventData.d_accel_rms   =stat.rootMeanSquare([eventData.d_accel_x,eventData.d_accel_y,eventData.d_accel_z]);
  //eventData.max_accel_x   =stat.max(sensorMeasurementsXMap.get(sensorid));
  //eventData.max_accel_y   =stat.max(sensorMeasurementsYMap.get(sensorid));
  //eventData.max_accel_z   =stat.max(sensorMeasurementsZMap.get(sensorid));
  eventData.accel_rms     =stat.rootMeanSquare([eventData.max_accel_x,eventData.max_accel_y,eventData.max_accel_z]);
  eventData.stddev_rms    =sdev_rms;
  */

  console.log("newSensorEventMessage: "+msg);

  if (typeof sensorEventMap.get(sensorevent_msg.sensorid) === 'undefined') {
    sensorEventMap.set(sensorevent_msg.sensorid, new Map());
  }
  if ( sensorevent_msg.time_end_ms === 0 ) {

console.log("--is EVENT");

    setSensorAsMoving(sensorevent_msg.sensorid, sensorevent_msg.d_accel_rms);
    sensorEventMap.get(sensorevent_msg.sensorid).set(eventData.time_start_ms, sensorevent_msg);
  }
  else {

console.log("--is END EVENT");

    setSensorAsActive(sensorevent_msg.sensorid);
    sensorEventMap.get(sensorevent_msg.sensorid).set(eventData.time_start_ms, sensorevent_msg);

    if ( sensorEventMap.get(sensorevent_msg.sensorid).length > MAX_SENSOR_EVENT_MAP_SIZE ) { 
      //todo:.. check if works
      console.log("--- delete item from event map");
      Array.from(sensorEventMap.get(sensorevent_msg.sensorid).keys())
     .slice(0, 1)
     .forEach(key => sensorEventMap.get(sensorevent_msg.sensorid).delete(key));
   }
  }

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

