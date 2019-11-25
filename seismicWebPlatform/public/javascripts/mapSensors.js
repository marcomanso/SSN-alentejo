CIRCLE_RADIUS = 5;

var sensorMarkerMap = {};


var blueIcon = new L.Icon({
  iconUrl: '/images/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});


function addMarker(sensorkey, name, model, latitude, longitude) {
  var options = { radius: CIRCLE_RADIUS };
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

function updateMap (msg) {

  //new sensor event received - 
  // check if sensor exists. If so, draw it  
  if (sensorMarkerMap.hasOwnProperty(msg.properties.id)) {
    markerSensor = trackMap[track_msg.properties.id];
    markerSensor.options.radius=10;
    markerSensor.options.color="#FF0000";
  }
}
