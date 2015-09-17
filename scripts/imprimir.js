var request = require('request');
var Q = require('q');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var printers = {
  "color": "Sinergia_Color",
  "negro": "Sinergia_Blanco_y_Negro"
};

var cost = {
  "color": 12,
  "negro": 2
}

var host = process.env.CUPS_SERVER;

var download = function(toPrint) {
  var url = toPrint.file.url;
  var deferred = Q.defer();
  var filename = "/tmp/" + toPrint.file.owner+ "-" + path.basename(url)
  var file = fs.createWriteStream(filename);

  request(url).pipe(fs.createWriteStream(filename)).on('close', function() {
    toPrint.print.path = filename;
    deferred.resolve(toPrint);
  });

  return deferred.promise;
}

var print = function(toPrint) {
  var cmd = "lp -h " + host + " -d " + toPrint.print.printer + " " + toPrint.print.path;
  var deferred = Q.defer();

  child_process.exec(cmd, function(err, stdout, stderr) {
    if (err) {
      console.log(stdout);
      console.log(stderr);
      console.log("child processes failed with error code: " + err.code);
    }

    var regexp = /request id is (.*) \((.*)\)/i;
    var parts = stdout.match(regexp);
    var printingId = parts[1];

    toPrint.print.id = printingId;

    deferred.resolve(toPrint);
  });

  return deferred.promise;
}

var checkInterval = null;

var checkForPrintId = function(id) {
  var stdout = child_process.execSync("lpstat -h " + host + " -W completed").toString();
  return stdout.indexOf(id) > -1;
}

var checkStatus = function(toPrint) {
  checkInterval = setInterval(function() {
    completed = checkForPrintId(toPrint.print.id);

    if(completed) {
      clearInterval(checkInterval);
      toPrint.response.send("El archivo `" + toPrint.file.name + "` fue completado");
      toPrint.response.send("El costo es de `$" + toPrint.print.cost + "` por pagina");
    }
  }, 5000);
}

return module.exports = function(robot) {
  robot.hear(/.*/i, function(res) {
    var slack = process.env.HUBOT_ADAPTER == "slack";
    if(!slack) return;

    var userName = res.message.user.name;
    var room = res.message.user.room;
    var isUpload = res.message.rawMessage.upload;

    // one to one conversation and you are sharing me a file.
    if(userName === room && isUpload) {
      var file = res.message.rawMessage.file;
      var user = res.message.user.id;
      var filename = file.name;
      var fileUrl = file.url_download;
      var hasComment = file.comments_count > 0;
      var printer = !hasComment ? 'negro' : file.initial_comment.comment;

      res.send("Voy a imprimir `" + filename + "` en `" + printer + "`");

      toPrint = {
        response: res,
        print: {
          path: null,
          id: null,
          printer: printers[printer],
          cost: cost[printer]
        },
        file: {
          url: fileUrl,
          name: filename,
          owner: user
        }
      }

      download(toPrint).then(print).then(checkStatus);
    }
  });
}
