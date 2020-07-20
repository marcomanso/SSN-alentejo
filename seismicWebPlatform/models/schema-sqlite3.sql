DROP TABLE events;
CREATE TABLE IF NOT EXISTS events (
  sensorkey      TEXT NOT NULL,
  time_start_ms  INTEGER NOT NULL,
  time_end_ms    INTEGER,
  d_accel_x      DOUBLE,
  d_accel_y      DOUBLE,
  d_accel_z      DOUBLE,
  d_accel        DOUBLE,
  accel_x        DOUBLE,
  accel_y        DOUBLE,
  accel_z        DOUBLE,
  accel          DOUBLE,
  stddev_abs     DOUBLE,
  mmi            DOUBLE,
  PRIMARY KEY (sensorkey, time_start_ms)
);
