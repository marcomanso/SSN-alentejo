request = require('request');
cheerio = require('cheerio');
fs = require('fs');

var debug = require('debug')('seismic:utils');

module.exports.isDefined = function (variable) {
  if (typeof variable === 'undefined')
    return false;
  else
    return true;
}

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
  return fs.readdirSync(path);
  
  /*
  return new Promise((resolve, reject) => {
    fs.readdir(path, function(err, items) {
      if (err) {
        debug("Error: "+err.message);
        //return reject(err);
        //error?  no problem - return no files
        resolve(files, directories);
      }
      console.log("Add sensor file: "+f);      
      for ( f of items ) {
        files.push(f);        
        //stat = f.statSync()
        if (f.isDirectory()) 
          directories.push(f);
        else if (f.isFile())      
          files.push(f);
      }
      resolve(files, directories);
    });
  }) //end Promise 
  */
  
} //end getSensorFiles
