module.exports = {

  getLongValueFrom32BitData: function (data) {
    return data.readInt32BE();
    //return (data.readInt(0)<<16 + data.readInt(1)<<8 + data.readInt(2));
  };

}
