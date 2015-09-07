Cleverbot = require('cleverbot-node');
cleverbot = new Cleverbot;

module.exports = function(robot) {
  robot.hear(/^(@)?tito(:)?(.*)/i, function(msg) {
    data = msg.match[3].trim();
    Cleverbot.prepare(function(){
      cleverbot.write(data, function (response) {
        msg.send(response.message);
      });
    });

  });
}
