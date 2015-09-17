Cleverbot = require('cleverbot-node');
Entities = require('html-entities').Html4Entities;

entities = new Entities;
cleverbot = new Cleverbot;

module.exports = function(robot) {
  robot.hear(/^(@)?tito(:)?(.*)/i, function(msg) {
    var slack = process.env.HUBOT_ADAPTER == "slack";
    var isUpload = !slack ? false : msg.message.rawMessage.upload;
    var data = msg.match[3].trim();

    // Stop hijacking the printing
    if(isUpload) return;

    Cleverbot.prepare(function(){
      cleverbot.write(data, function (response) {
        var response = response.message;
        var fixedResponse = entities.decode(response);

        msg.send(fixedResponse);
      });
    });

  });
}
