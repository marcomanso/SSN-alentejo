import os
import sys
import json
import sqlite3

global SETTINGS_FILE
SETTINGS_FILE='settings.json'

global settings_data

global db_connection


##
##  READ CONFIG FILES

def read_settings():
  global settings_data
  with open(SETTINGS_FILE) as json_file:  
    settings_data = json.load(json_file)
    print(json.dumps(settings_data,indent=2))

def get_sensor_pub(SENSOR_PUB_FILE):
  with open(SENSOR_PUB_FILE, 'r') as myfile:
    #data=myfile.read().replace('\n', '')
    data=myfile.read()
  return data
    
def get_file_pub(sensorKey):
  return sensorKey+".pub"

##
##  DB OPERATIONS

##  try:
##  except sqlite3.Error as error:

#def connect_to_db(db):
  #db_connection=sqlite3.connect(settings_data['db_name'])

def add_sensor_db(sensorkey, file_sensor_pub):
  sensor_pub = get_sensor_pub(file_sensor_pub)
  if not sensor_pub:
    print("Error reading ",sensor_pub)
  else:
    db_connection=sqlite3.connect(settings_data['db_name'])
    cursorObj=db_connection.cursor()
    cursorObj.execute("INSERT INTO SensorCertificate VALUES('"+sensorkey+"', '"+sensor_pub+"', "+settings_data['active_value']+")")
    db_connection.commit()
    db_connection.close()                  
    print("Added sensor ",sensorkey," - Done !")

def remove_sensor_db(sensorkey):
  db_connection=sqlite3.connect(settings_data['db_name'])
  cursorObj=db_connection.cursor()
  cursorObj.execute("DELETE FROM SensorCertificate WHERE sensorKey is '"+sensorkey+"'")
  db_connection.commit()
  db_connection.close()                  
  print("Remove sensor ",sensorkey," - Done !")

def remove_all():  
  db_connection=sqlite3.connect(settings_data['db_name'])
  cursorObj=db_connection.cursor()
  rows = cursorObj.execute("DELETE FROM SensorCertificate")
  rows=cursorObj.fetchall()
  for row in rows:
    print("deleted: ",row)  
  db_connection.commit()
  db_connection.close()
  print("Remove all sensors - Done !")

def list_all_sensors_db():
  print("List all sensors:")
  db_connection=sqlite3.connect(settings_data['db_name'])
  cursorObj=db_connection.cursor()
  cursorObj.execute("SELECT * FROM SensorCertificate ORDER BY sensorKey")
  rows=cursorObj.fetchall()
  for row in rows:
    print(row)  
  db_connection.close()                  
  print("Done !")


##
## MENU

def exit():
  #db_connection.close()
  os._exit(0)


def menu():
  print()
  print('######################################################')
  print('##       Sensors Certificate Management')
  print('######################################################')
  print()
  print('Database is',settings_data['db_name'])
  print()
  print('\t1 - Add sensor certificate')
  print('\t2 - Remove sensor certificate')
  print('\t3 - List sensor certificates')
  print()
  print('\t7 - Remove ALL certificates')
  print()
  print('\t0 - QUIT')
  print()
  inTxt = input("Option>")

  if (inTxt =='0'):
    exit()
  elif (inTxt =='1'):
    sensorKey=input("Insert sensorKey>")
    add_sensor_db(sensorKey, get_file_pub(sensorKey))
  elif (inTxt =='2'):
    sensorKey=input("Insert sensorKey>")
    remove_sensor_db(sensorKey)
  elif (inTxt =='3'):
    list_all_sensors_db()
  elif (inTxt =='7'):
    remove_all()
  
  
##
##  MAIN

if __name__ == '__main__':

  print("Usage: server_settings [sensorkey]")
  
  if len(sys.argv) < 2:
    print("NEED AS INPUT: db_settings_file. Exiting...")
    exit()

  SETTINGS_FILE=sys.argv[1]
  print('Loading Database....')
  read_settings()

  if len(sys.argv) == 3:
    SENSOR_KEY = sys.argv[2]
    print("Adding PUB for sensor: ",SENSOR_KEY)
    add_sensor_db(SENSOR_KEY, get_file_pub(SENSOR_KEY))
    exit()

  while True:
    menu()


