request = require('request');
cheerio = require('cheerio');
fs = require('fs');

var debug = require('debug')('seismic:utils');

module.exports.getSensorURLFiles = function (name, url) { 
  var files = [];
  return new Promise((resolve, reject) => {
    request(url, function(error, response, html) {
      if (error) {
        debug("Error: "+error.message);
        return reject(error);
      }
      var cheerio_data = cheerio.load(html);
      cheerio_data("a:contains(" + name + ")").each( (i,element) => {
        files.push(cheerio_data(element).attr('href'));
      });
      resolve(files);
    })
  }) //end Promise 
} //end getSensorFiles

module.exports.getSensorFiles = function (name, path) { 
  var files = [];
  return new Promise((resolve, reject) => {
    fs.readdir(path, function(err, items) {
      if (err) {
        debug("Error: "+err.message);
        //return reject(err);
        //error?  no problem - return no files
        resolve(files);
      }
      for ( f of items ) {
        files.push(f);
        debug("Add sensor file: "+f);
      }
      /*
      for (var i=0; i<items.length; i++) {
        if (items[i].indexOf(name)!==-1)
          files.push(items[i]);
          debug("Add sensor file: "+items[i]);
      }
      */
      resolve(files);
    });
  }) //end Promise 
} //end getSensorFiles
