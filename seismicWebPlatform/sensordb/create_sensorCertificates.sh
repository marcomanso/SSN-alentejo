#!/bin/bash
SETTINGS_DB=settings.json
CERT_PUB=sensor.pub

for i in {1..20}
do
    sensor_id="sensor_$i"
    sensor_cert="$sensor_id".pub

    cp "$CERT_PUB" "$sensor_cert"

	echo "-- create $sensor_id with cert $sensor_cert"  
	python3 sensorCertificate.py $SETTINGS_DB  $sensor_id
	#arduino-cli upload -p $USB_PORT --fqbn esp8266:esp8266:nodemcu $sensor_id
done

