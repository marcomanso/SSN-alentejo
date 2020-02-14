#!/usr/bin/python3

#
# instalation
#
# pyenv
# add to .bash_profile:
#    eval "$(pyenv init -)"
# 
# 
# pip install pycryptodome
# pip install websocket_client
#
#  check /Users/marcomanso/.pyenv/versions/3.7.3/lib/python3.7/site-packages
# 
# -> fix the problem by renaming the install directory crypto to => Crypto


import os
import sys
import time
import datetime
import threading
import random
import requests
#from requests.auth import HTTPDigestAuth
import json
import ssl
import math

#import rsa
import base64

from Crypto.PublicKey import RSA
from Crypto.Signature import PKCS1_v1_5
from Crypto.Hash import SHA

#import asyncio
import websocket  # websocket-client

# REST requests
# "http://"+SERVER_IP+":"+SERVER_PORT+"/sensors/addsensor"
global add_sensor_suffix
add_sensor_suffix = "/sensors/addsensor"
global update_sensor_suffix
update_sensor_suffix = "/sensors/updatesensor"
global delete_sensor_suffix 
delete_sensor_suffix = "/sensors/deletesensor"

global SENSOR_FILE
global sensor_data

global DATA_VARIABILITY_AMOUNT 
DATA_VARIABILITY_AMOUNT = 0.2
global DATA_FREQUENCY_HZ 
DATA_FREQUENCY_HZ = 10.0

global SETTINGS_FILE
global settings_data

MESSAGE_KEY = "sensor".encode('utf8')

global timeDATA_NOW
timeDATA_NOW = time.time()
global timeDATA_PREV
timeDATA_PREV = time.time()

global WS_SENSOR_DATA

global a_x
global a_y
global a_z


##
##  READ CONFIG FILES

def read_settings(FILE):
  global settings_data
  with open(FILE) as json_file:  
    settings_data = json.load(json_file)
    print(json.dumps(settings_data,indent=2))

def read_sensor(FILE):
  global sensor_data
  global DATA_VARIABILITY_AMOUNT
  global DATA_FREQUENCY_HZ
  with open(FILE) as json_file:  
    sensor_data = json.load(json_file)
    DATA_VARIABILITY_AMOUNT = float(sensor_data['variability_amount'])
    DATA_FREQUENCY_HZ = float(sensor_data['frequency'])
    print(json.dumps(sensor_data,indent=2))

    
def read_sensor_certificate(SENSOR_CERT_FILE):
  with open(SENSOR_CERT_FILE, 'r') as file:
    #data=file.read().replace('\n', '')
    data=file.read()
  return data

def generate_signature():
  #PKCS#1 (uses RSA)
  #sensor_pem = #read_sensor_certificate(sensor_data['key']+".pem")
  #privkey = rsa.PrivateKey.load_pkcs8(sensor_pem)
  #signature = rsa.sign(MESSAGE_KEY, privkey, 'SHA-1')

  #PKCS#8 (uses crypto)
  key = RSA.importKey(open(sensor_data['key']+".pem", 'r').read())
  h = SHA.new(MESSAGE_KEY)
  signer = PKCS1_v1_5.new(key)
  signature = signer.sign(h)
    
  #print(key)
  #print(h)
  #print(signer)
  #print(signature)
  
  return base64.b64encode(signature)
  #key_priv=RSA.importKey(read_sensor_certificate(sensor_data['key']+".pem"))
  #h = SHA.new(str.encode(MESSAGE_KEY))
  #signer = PKCS1_v1_5.new(key_priv)
  #signature = signer.sign(h)
  #return signature


##
##

def post_data(url, data):
  print('-- url: '+url+ '\n-- sending: '+json.dumps(data))
  headers={
    "Content-Type": "application/json;charset=utf-8",
  }
  myResponse = requests.post(
    url=url, data=data, headers=headers)
  #url, json=data, headers=headers)
  if(myResponse.ok):
    print('-- Result OK')
  else:
    print('-- Error')
    myResponse.raise_for_status()


def sensor_update_create (url):     
  #print('sending: '+json.dumps(data_array,indent=2))

  data = json.dumps({
    "sensorkey": sensor_data['key'],
    "name": sensor_data['name'],
    "description": sensor_data['description'],
    "latitude": sensor_data['latitude'],
    "longitude": sensor_data['longitude'],
    "elevation": sensor_data['elevation'],
    "model": sensor_data['model'],
    "model_URL": sensor_data['model_URL'],
    "timecreated": datetime.datetime.utcfromtimestamp(time.time()).isoformat(),
    "sensor_URL": "http://"+settings_data['host']+":"+settings_data['rest_port'],
    "data_URL": "ws://"+settings_data['host']+":"+settings_data['sensor_data_port']
  })  
  post_data(url, data);

  
def create_sensor(): 
  url="http://"+settings_data['host']+":"+settings_data['rest_port']+add_sensor_suffix
  sensor_update_create(url)

  
def update_sensor(): 
  url="http://"+settings_data['host']+":"+settings_data['rest_port']+update_sensor_suffix
  sensor_update_create(url)

  
def delete_sensor():
  url="http://"+settings_data['host']+":"+settings_data['rest_port']+delete_sensor_suffix
  data = json.dumps({"sensorkey": sensor_data['key']})
  post_data(url, data);


def get_url_sensor_ws():
  return "ws://"+settings_data['host'] \
    +":"+settings_data['sensor_data_port'] \
    +"/"+sensor_data['key']
  
  
def get_string_value(v):
  WIDTH=13 # ranges from 0(=-1) to 5 (=0) 8(+1)
  s = list("-"*WIDTH)
  
  half_scale = int(WIDTH/2.0)
  index = int( v*WIDTH/4+ half_scale )
  if (index<0): 
    index=0
  elif (index>WIDTH-1): 
    index=WIDTH-1
  s[index]='*'
  return "".join(s)

def generate_random_values():
  global a_x
  global a_y
  global a_z
  a_x =  1.0+DATA_VARIABILITY_AMOUNT*random.randint(-50,50)/100.0
  a_y =  0.0+DATA_VARIABILITY_AMOUNT*random.randint(-50,50)/100.0
  a_z = -1.0+DATA_VARIABILITY_AMOUNT*random.randint(-50,50)/100.0

  
def generate_sin_values(t):
  global a_x
  global a_y
  global a_z
  a_x = math.sin(2.0*math.pi*DATA_FREQUENCY_HZ*t/1000.0)
  a_y = math.cos(2.0*math.pi*DATA_FREQUENCY_HZ*t/1000.0)
  a_z = a_x+a_y


def connect_to_server_ws():
  global WS_SENSOR_DATA
  ws_url = get_url_sensor_ws()
  print("Connect to: "+ws_url)
  WS_SENSOR_DATA = websocket.WebSocket(sslopt={"cert_reqs": ssl.CERT_NONE})
  signature=generate_signature()
  signature_b64 = str(signature, "utf-8")
  
  #print(signature_b64)
  #print("sig size:",len(signature_b64),"=>",signature_b64)
  
  WS_SENSOR_DATA.connect(
    ws_url, 
    header=[
      "user-agent: "+sensor_data['key'], 
      "x-custom: "+signature_b64], 
    subprotocols=[settings_data['protocol']])
  
    
def send_data_to_server_ws(data):
  try:
    WS_SENSOR_DATA.send(data)
  except websocket.WebSocketException as err:
    print("-- Error in websocket:",err)
    
    
def stream_data_forever(option):
  global timeDATA_PREV
  global timeDATA_NOW
  PERIOD_s = 1.0/DATA_FREQUENCY_HZ;
  #PERIOD_s = 0.1
  
  connect_to_server_ws()
  
  while (True):
    t=time.time()
    t_sec=int(t)
    t_nano=int((t-t_sec)*1000000)
    
    if (option=='6'):
      generate_sin_values(t)
    else:
      generate_random_values()
    
    #
    data= json.dumps({
      "sensorID":       sensor_data['key'],
      "time_epoch_sec": t_sec,
      "time_nano":      t_nano,
      "accel_x":        a_x,
      "accel_y":        a_y,
      "accel_z":        a_z })
    #print("-- sending: "+data)
    #send_data_to_server_ws(data);
    send_data_to_server_ws(data)
    
    #
    timeDATA_PREV = timeDATA_NOW
    timeDATA_NOW  = t
    f=int(1/(timeDATA_NOW-timeDATA_PREV))
   
    sys.stdout.write("\b\b\b\b\b\b\b\b\b\b")
    sys.stdout.write("\b\b\b\b\b\b\b\b\b\b")
    sys.stdout.write("\b\b\b\b\b\b\b\b\b\b")
    sys.stdout.write("\b\b\b\b\b\b\b\b\b\b")
    sys.stdout.write("\b\b\b\b\b\b\b\b\b\b")
    sys.stdout.write("\b\b\b\b\b\b\b\b\b\b")
    sys.stdout.write("\b\b\b\b\b\b\b\b\b\b")
    sys.stdout.write("f=")
    sys.stdout.write(str(f))
    sys.stdout.write("(Hz)    ")
    sys.stdout.write(get_string_value(a_x))
    sys.stdout.write("|")
    sys.stdout.write(get_string_value(a_y))
    sys.stdout.write("|")
    sys.stdout.write(get_string_value(a_z))
    sys.stdout.flush()
    time.sleep(PERIOD_s)


  
##
## MENU

def menu():
  print('######################################################')
  print('##       SSN-Alentejo SENSOR Simulator')
  print('######################################################')
  print()
  print('Sensor is "'+sensor_data['name']
        +'" (sensor_key=',sensor_data['key'],')')
  print('-- variability amount:\t',DATA_VARIABILITY_AMOUNT)
  print('-- frequency:\t\t',DATA_FREQUENCY_HZ)
  print('-- range:\t\t',sensor_data['range'],' (scale is',sensor_data['convert_scale'],')')
  print()
  print('\t1 - Register (new) Sensor')
  print('\t2 - Update Sensor')
  print('\t3 - Delete Sensor')
  print()
  print('\t5 - Start RANDOM STREAMING (will loop forever)')
  print('\t6 - Start SIN STREAMING (will loop forever)')
  print()
  print('\t0 - QUIT')
  print()
  inTxt = input("Option>")

  if (inTxt =='0'):
    #post_data(...)
    os._exit(0)
  elif (inTxt =='1'):
    #post_data(...)
    create_sensor()
  elif (inTxt =='2'):
    #post_data(...)
    update_sensor()
  elif (inTxt =='3'):
    #post_data(...)
    delete_sensor()
  elif (inTxt =='5'):
    stream_data_forever(inTxt)
  elif (inTxt =='6'):
    stream_data_forever(inTxt)


##
##  MAIN

if __name__ == '__main__':

  if len(sys.argv) < 3:
    print("USAGE: server_settings sensor_file.")
    exit()

  SETTINGS_FILE=sys.argv[1]
  PERSON_FILE=sys.argv[2]

  print('-- Loading Settings....')
  read_settings(SETTINGS_FILE)
  print('-- Loading Sensor....')
  read_sensor(PERSON_FILE)  
  #print('-- Authenticating....')
  #auth_portal()
  
  
  while True:
    menu()
