var ipp = require('ipp');
var fs = require('fs');
var path = require('path');
var request = require('request');
var Q = require('q');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var printCenter = process.env.CUPS_SERVER;

var User = function(id, name) {
  this.id = id;
  this.name = name;
};

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
    this.pages = information['number-of-documents'];
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
  var uri = "http://" + printCenter + "/printers/" + name;
  var sent = Q.defer();
  var self = this;

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
      var user = new User(slackUser.id, userName);
      var printer = new Printer("Sinergia_Blanco_y_Negro");
      var job = new Job(user, fileUrl, options);

      res.send("kuak");

      printer.print(job).then(function(res) {
        job.enqueued.then(function() {
          var msg = "Voy a imprimir (" + options.copies + "x)";
          console.log("enqueued");
          robot.send({ room: room }, msg);
          //user.notify("enqueued", job);
        });

        job.completed.then(function() {
          var msg = "Tu impresion esta lista. Fueron " + job.pages + " paginas";
          robot.send({ room: room }, msg);
          console.log("completed");
          //user.notify("completed", job);
        });
      });

    }

  });
}
