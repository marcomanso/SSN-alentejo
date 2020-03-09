module.exports = {

  getLongValueFrom32BitData: function (data) {
    return data.readInt32BE();
    //return (data.readInt(0)<<16 + data.readInt(1)<<8 + data.readInt(2));
  },

  //return mercalli intensity scale
  getMercalliIntensity : function (accel_abs) {
  	let c1, c2;
  	if (accel_abs<0.07) {
  		c1=2.65;
  		c2=1.39;
  	}
  	else {
  		c1=-1.91;
  		c2=4.09;

  	}
  	return (c1+c2*Math.log(accel_abs));

  	/*
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
  	*/
  },

  //return mercalli intensity scale
  getAccelFromMercalliIntensity : function (intensity) {
  	if (intensity>=12) {
  		return 3.0;
  	}
  	else if (intensity>=11) {
  		return 1.5;
  	}
  	else if (intensity>=10) {
  		return 0.7;
  	}
  	else if (intensity>=9) {
  		return 0.3;
  	}
  	else if (intensity>=8) {
  		return 0.15;
  	}
  	else if (intensity>=7) {
  		return 0.07;
  	}
  	else if (intensity>=6) {
  		return 0.03;
  	}
  	else if (intensity>=5) {
  		return 0.015;
  	}
  	else if (intensity>=4) {
  		return 0.007;
  	}
  	else if (intensity>=3) {
  		return 0.003;
  	}
  	else if (intensity>=2) {
  		return 0.0015;
  	}
  	else {
  		return 0.0;
  	}
  },

  getColorMercalliIntensity : function (intensity) {
	let transp = 0.9*(intensity/12.0);
	return [255, 200, 200, transp];
  },

};
