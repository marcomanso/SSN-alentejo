module.exports = class Sensor {
  constructor(sensorkey, name, description, lat, lon, elevation, model, model_URL, timecreated, sensor_URL, data_URL) {
    this.sensorkey = sensorkey;
    this.name = name;
    this.description = description;
    this.latitude = lat;
    this.longitude = lon;
    this.elevation = elevation;
    this.model = model;
    this.model_URL = model_URL;
    this.timecreated = timecreated;
    this.sensor_URL = sensor_URL;
    this.data_URL = data_URL;
  } 
};
