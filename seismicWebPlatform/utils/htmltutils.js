var htmlparser = require("htmlparser");

var rawHtml = "Xyz <script language= javascript>var foo = '<<bar>>';< /  script><!--<!-- Waah! -- -->";


module.exports.parseHtml = function (html) {


  var handler = new htmlparser.DefaultHandler(function (error, dom) {
    if (error) return;
    //if (error)
    //  [...do something for errors...]
    //else
    //  [...parsing done, do something...]
  });
  var parser = new htmlparser.Parser(handler);
  parser.parseComplete(rawHtml);
  sys.puts(sys.inspect(handler.dom, false, null));

}
