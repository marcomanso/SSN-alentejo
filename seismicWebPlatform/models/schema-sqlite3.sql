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

DROP TABLE events IF EXISTS;
CREATE TABLE IF NOT EXISTS events (
  sensorkey      TEXT NOT NULL,
  time_start_ms  INTEGER NOT NULL,
  PRIMARY KEY (sensorkey, time_start_ms),
  time_end_ms    INTEGER,
  d_accel_x      DOUBLE,
  d_accel_y      DOUBLE,
  d_accel_z      DOUBLE,
  d_accel_rms    DOUBLE,
  max_accel_x    DOUBLE,
  max_accel_y    DOUBLE,
  max_accel_z    DOUBLE,
  max_accel_rms  DOUBLE,
  stddev_rms     DOUBLE
);
