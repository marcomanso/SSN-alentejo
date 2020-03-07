module.exports = {

  getLongValueFrom32BitData: function (data) {
    return data.readInt32BE();
    //return (data.readInt(0)<<16 + data.readInt(1)<<8 + data.readInt(2));
  },

  //return mercalli intensity scale
  getMercalliIntensity : function (accel_abs) {

  	if (accel_abs > 3.0 ) {
  		return 12;
  	}
  	else if (accel_abs > 1.5) {
  		return 11;
  	}
  	else if (accel_abs > 0.7) {
  		return 10;
  	}
  	else if (accel_abs > 0.3) {
  		return 9;
  	}
  	else if (accel_abs > 0.15) {
  		return 8;
  	}
  	else if (accel_abs > 0.07) {
  		return 7;
  	}
  	else if (accel_abs > 0.03) {
  		return 6;
  	}
  	else if (accel_abs > 0.015) {
  		return 5;
  	}
  	else if (accel_abs > 0.007) {
  		return 4;
  	}
  	else if (accel_abs > 0.003) {
  		return 3;
  	}
  	else if (accel_abs > 0.0015) {
  		return 2;
  	}
  	else
  		return 1;
  	},

	getColorMercalliIntensity : function (intensity) {
	  let transp = 0.3*(intensity/12.0);
	  return [255, 200, 200, transp];
	},

}
