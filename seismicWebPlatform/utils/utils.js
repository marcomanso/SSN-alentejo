
module.exports = {

   getPaddedNumber: function (number) {
     return (number < 10 ? "0" : "") + number;
   },
  
   getDateTime_In_YYYYMMDD: function(date) {
	   var year = date.getUTCFullYear();
       var month = date.getUTCMonth() + 1;
	   month = (month < 10 ? "0" : "") + month;
       var day  = date.getUTCDate();
	   day = (day < 10 ? "0" : "") + day;

	   return "" + year + "" + month + "" + day;
   },

   getDateTime_In_HHMMSS: function(date) {
	   var hour = date.getUTCHours();
	   hour = (hour < 10 ? "0" : "") + hour;
	   var min  = date.getUTCMinutes();
	   min = (min < 10 ? "0" : "") + min;
	   var sec  = date.getUTCSeconds();
	   sec = (sec < 10 ? "0" : "") + sec;

	   return "" + hour + "" + min + "" + sec;
   },

   getDateTime_In_YYYYMMDD_HH: function(date) {
	   var hour = date.getUTCHours();
	   hour = (hour < 10 ? "0" : "") + hour;
   	   return this.getDateTime_In_YYYYMMDD(date) + "_" + hour;
   },

   getDateTime_InYYYYMMDD_HHMMSS: function(date) {
	   return this.getDateTime_In_YYYYMMDD(date) + this.getDateTime_In_HHMMSS(date);
   },
  
   getWS_URL: function (http_url) {
     return http_url.replace('http://', 'ws://');
   }

}
