var ipp = require('ipp');
var fs = require('fs');
var path = require('path');
var request = require('request');
var Q = require('q');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var User = function(slackUser, proxy) {
  this.id = slackUser.id;
  this.name = slackUser.name;
  this.room = slackUser.room;
  this.proxy = proxy;
};

User.prototype = {
  notify: function(msg) {
    this.proxy.send({ room: this.room }, msg);
  }
}

var Job = function(user, url, options) {
  var self = this;

  var enqueued = Q.defer();
  var completed = Q.defer();
  var ready = Q.defer();

  this.file = "";
  this.id = null;
  this.uri = null;
  this.state = "initial";
  this.pages = 0;

  this.finished = false;

  this.owner = user;
  this.mimeType = "text/plain";

  this.quantities = {};
  if(options.copies > 1) { this.quantities["copies"] = options.copies; }
  if(options.range != "") { this.quantities["page-ranges"] = options.range;  }

  this.enqueued = enqueued.promise;
  this.completed = completed.promise;
  this.ready = ready.promise;

  this._enqueued = function() { enqueued.resolve() };
  this._completed = function() { completed.resolve() };

  (function(url) {
    var cleanName = url.split(/[?#]/)[0];
    var filename = "/tmp/" + user.id + "-" + path.basename(cleanName);
    var file = fs.createWriteStream(filename);
    var downloaded = Q.defer();

    request(url).pipe(fs.createWriteStream(filename)).on('close', function() {
      downloaded.resolve(filename);
    });

    return downloaded.promise;
  })(url).then(function(filename) {
    self.file = filename;
    self.mimeType = mime.lookup(filename);

    ready.resolve(self);
  });

};

Job.prototype = {
  update: function(information) {

    this.state = information['job-state'];
    this.pages = information['job-media-sheets-completed'];
    this.finished = this.state == "completed" ||
                    this.state == "aborted" ||
                    this.state == "cancelled";

    switch(this.state) {
      case 'processing':
        this._enqueued();
        break;

      case 'completed':
        this._completed();
        break;
    }
  }
};

var Printer = function(name) {
  var ids = { "color": "Sinergia_Color", "negro": "Sinergia_Blanco_y_Negro"}
  var printCenter = process.env.CUPS_SERVER;

  var uri = "http://" + printCenter + "/printers/" + ids[name];
  var sent = Q.defer();
  var self = this;

  var prices = { "color": 12, "negro": 2 }

  this.name = ids[name];
  this.id = name;
  this.pricePerPage = prices[this.id];

  this.sent = sent.promise;
  this._printer = ipp.Printer(uri);

  this._checkJob = function(job) {
    var state = Q.defer();
    var jobStatus = {
      "operation-attributes-tag": {
        'job-uri': job.uri
      }
    };

    self._printer.execute("Get-Job-Attributes", jobStatus, function(err, res){
      var wrapper = res['job-attributes-tag'];
      state.resolve(wrapper);
    });

    return state.promise;
  };

  this._print = function(job) {
    var print = {
      "operation-attributes-tag": {
        "requesting-user-name": job.owner.name,
        "job-name": "Printing tito",
        "document-format": job.mimeType,
      },

      data: fs.readFileSync(job.file)
    };

    if(Object.keys(job.quantities).length != 0 ) {
      print["job-attributes-tag"] = job.quantities
    }

    // Print file
    self._printer.execute("Print-Job", print, function(err, res){
      var info = res['job-attributes-tag'];

      job.id = info['job-id'];
      job.uri = info['job-uri'];
      job.state = info['job-state'];

      self.checkStatus(job);

      sent.resolve(res);
    });

  };
};

Printer.prototype = {
  print: function(job) {
    var self = this;

    job.ready.then(self._print);

    return this.sent;
  },

  checkStatus: function(job) {
    var self = this;
    var check = function(job) {
      self._checkJob(job).then(function(info) {
        job.update(info);

        if(!job.finished) {
          setTimeout(function() { check(job); }, 5000);
        }
      });
    }

    check(job);

  }
}
var lookup = { copies: /([1-9])/im, printer: /(color|negro)/im, range: /([1-9]-[1-9][0-9]?)/im };
var defaults = { copies: 1, printer: 'negro', range: '' }

return module.exports = function(robot) {
  robot.hear(/.*/i, function(res) {
    var slack = process.env.HUBOT_ADAPTER == "slack";
    if(!slack) return;

    var slackUser = res.message.user;
    var userName = slackUser.name;
    var room = res.message.user.room;
    var isUpload = res.message.rawMessage.upload;

    // one to one conversation and you are sharing me a file.
    if(userName === room && isUpload) {
      var file = res.message.rawMessage.file;
      var hasComment = file.comments_count > 0;
      var comment = !hasComment ? '' : file.initial_comment.comment;
      var options = {};

      for(var k in lookup) {
        var look = lookup[k];
        var parts = comment.match(look);
        var val = parts != null ? parts[1] : defaults[k];

        options[k] = val;
      }

      var fileUrl = file.url_download;
      var ext = path.extname(fileUrl);

      if(ext == ".doc" || ext == ".docx") {
        var msg = "Perdon pero no se imprimir `" + ext + "` :pensive:. Si lo convertis en PDF no voy a tener problemas." ;
        robot.send({ room: room }, msg);

        return;
      }

      var Host = function(userName, robot) {
        this.name = userName;
        this.robot = robot;
      }

      Host.prototype = {
        notify: function(msg) {
          this.robot.send({ room: this.name }, msg);
        }
      };

      var hostName = process.env.HOST_USER || "host";
      var host = new Host(hostName, robot);
      var user = new User(slackUser, robot);
      var printer = new Printer(options.printer);
      var job = new Job(user, fileUrl, options);

      printer.print(job).then(function(res) {
        job.enqueued.then(function() {
          console.log("enqueued");

          host.notify(
            "@" + user.name + " mando a imprimir `" + options.copies + "` copias en impresora `" + printer.name + "`."
          );

          user.notify(
            "Voy a imprimir (`" + options.copies + "x`) en " + printer.id + " :fax:"
          );
        });

        job.completed.then(function() {
          console.log("completed");
          var message = "Tu impresion esta lista :clap:.\n";

          if(job.pages > 0) {
            message = message + "Cantidad de paginas: `" + job.pages + "`. \n" +
                      "El precio total es: `$" + (job.pages * printer.pricePerPage) + "`. \n";
          } else {
            message = "El precio por pagina es de `$" + printer.pricePerPage + "`\n";
          }

          message = message + "Por favor paga en la latita al lado de las impresoras :money_with_wings:.";

          user.notify(message);
        });
      });

    }

  });
}
