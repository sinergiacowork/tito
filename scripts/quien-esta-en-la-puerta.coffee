# Description
#   Quien esta en la puerta
#
# Commands:
#   hubot quien esta en la puerta? - Muestra quien esta en la puerta

module.exports = (robot) ->
  robot.respond /(quien esta en la puerta)(\?)?/i, (msg) ->
    msg.send "http://gatekeeper-sinergia.herokuapp.com/door.jpg?" + new Date().getTime();
