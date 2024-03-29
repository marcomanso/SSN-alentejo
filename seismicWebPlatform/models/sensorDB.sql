DROP TABLE sensors;
CREATE TABLE IF NOT EXISTS sensors (
  sensorkey      CHAR(20) PRIMARY KEY NOT NULL,
  name           CHAR(20) NOT NULL,
  description    TEXT,
  lat            DOUBLE NOT NULL,
  lon            DOUBLE NOT NULL,
  elevation      DOUBLE NOT NULL,
  model          VARCHAR(100),
  model_URL      VARCHAR(100),
  timecreated    VARCHAR(255),
  sensor_URL     VARCHAR(100) NOT NULL,
  data_URL       VARCHAR(100) NOT NULL
);

DROP TABLE SensorCertificate;
CREATE TABLE IF NOT EXISTS SensorCertificate (
  sensorkey      CHAR(20) PRIMARY KEY NOT NULL,
  certificate    TEXT NOT NULL,
  status         INTEGER
);
