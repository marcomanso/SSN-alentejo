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
    "sensorid":      "sensor_adxl355_0001",
    "time_start_ms": 1583597964185,
    "time_update_ms":1583597964493,
    "time_end_ms":   1583597964494,
    "max_accel_x":   -0.01104205322265625,
    "max_accel_y":   0.0213004150390625,
    "max_accel_z":   1.0028894958496093,
    "d_accel_x":     -0.00001818847656250011,
    "d_accel_y":     0.000027435302734375028,
    "d_accel_z":     0.000012634277343659406,
    "d_accel":       0.00003525821152282015,
    "accel":         1.0031764428582302,
    "stddev_abs":    0.000550210009755386
   }

 */


var sensorMap = new Map();
var sensorMarkerMap = new Map();
var sensorEventMap = new Map();
var sensorIsMovingMap = new Map();
var MAX_SENSOR_EVENT_MAP_SIZE = 1024;

/* 
 * FUNCTIONS 
 *
 */

function displayEventAlert(eventData) {
  let time = new Date(eventData.time_start_ms);
  let mmi = '-';
  if (typeof eventData.mmi !== 'undefined')
    mmi=eventData.mmi.toFixed(1);
  if (eventData.time_end_ms === 0) {
    document.getElementById("alert_event").innerHTML 
      = "Recorded event started at "+time.toISOString()+" with MMI "+mmi+" for sensor "+eventData.sensorid;
  }
  else {
    document.getElementById("alert_event").innerHTML 
      = "Recorded event at "+time.toISOString()+" lasted "+(eventData.time_end_ms-eventData.time_start_ms)+" (ms) with MMI "+mmi+" for sensor "+eventData.sensorid;
  }
}

//

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
  if (typeof sensorIsMovingMap.get(sensorid) !== 'undefined')
    return sensorIsMovingMap.get(sensorid);
  return false;
}

function newSensorEventMessage(msg) {

  var sensorevent_msg = JSON.parse(msg);

  //process only if known sensor
  if ( typeof sensorMap.get(sensorevent_msg.sensorid) === 'undefined')
    return; 

  if (typeof sensorEventMap.get(sensorevent_msg.sensorid) === 'undefined') {
    sensorEventMap.set(sensorevent_msg.sensorid, new Map());
    sensorIsMovingMap.set(sensorevent_msg.sensorid,false);
  }

  if ( sensorevent_msg.time_end_ms === 0 ) {
    sensorEventMap.get(sensorevent_msg.sensorid).set(sensorevent_msg.time_start_ms, sensorevent_msg);
    sensorIsMovingMap.set(sensorevent_msg.sensorid,true);
    setSensorAsMoving(sensorevent_msg.sensorid, sensorevent_msg.d_accel);
    displayEventAlert(sensorevent_msg);
  }
  else {
    sensorEventMap.get(sensorevent_msg.sensorid).set(sensorevent_msg.time_start_ms, sensorevent_msg);
    sensorIsMovingMap.set(sensorevent_msg.sensorid,false);
    setSensorAsActive(sensorevent_msg.sensorid);
    displayEventAlert(sensorevent_msg);
    //keep size manageable - remove first element if too big
    if ( sensorEventMap.get(sensorevent_msg.sensorid).length > MAX_SENSOR_EVENT_MAP_SIZE ) {
      let key=m.values().next().value;
      sensorEventMap.get(sensorevent_msg.sensorid).delete(key);
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

