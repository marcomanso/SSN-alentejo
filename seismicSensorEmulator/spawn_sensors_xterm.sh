#!/bin/bash

NUMBER_SUBS=5

if [ "$1" != "" ]; then
  NUMBER_SUBS="$1"
fi

for i in $(seq 1 $NUMBER_SUBS)
do

  xterm -hold -e node sensorEmulator sensor_dummy_$i &

done
