Cleverbot = require('cleverbot-node');
cleverbot = new Cleverbot;

module.exports = function(robot) {
  robot.hear(/^(@)?tito(:)?(.*)/i, function(msg) {
    var isUpload = msg.message.rawMessage.upload;
    var data = msg.match[3].trim();

    // Stop hijacking the printing
    if(isUpload) return;

    Cleverbot.prepare(function(){
      cleverbot.write(data, function (response) {
        msg.send(response.message);
      });
    });

  });
}
