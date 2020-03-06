CREATE TABLE IF NOT EXISTS events (
  sensorkey      TEXT PRIMARY KEY NOT NULL,
  time_start_ms  INTEGER PRIMARY KEY NOT NULL,
  time_end_ms    INTEGER,
  d_accel_x      DOUBLE,
  d_accel_y      DOUBLE,
  d_accel_z      DOUBLE,
  d_accel_rms    DOUBLE,
  d_accel_rms    DOUBLE,
  stddev_rms     DOUBLE
);
