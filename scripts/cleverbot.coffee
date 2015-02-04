# Description:
#   "Makes your Hubot even more Clever™"
#
# Dependencies:
#   "cleverbot-node": "0.1.1"
#
# Configuration:
#   None
#
# Commands:
#   hubot c <input>
#
# Author:
#   ajacksified

cleverbot = require('cleverbot-node')

random = () ->
  return Math.floor(Math.random() * 100)

module.exports = (robot) ->
  c = new cleverbot()

  robot.hear /^(@)?tito(:)?(.*)/i, (msg) ->
    if random() == 42
      msg.send "Como tu ex"
    else
      data = msg.match[3].trim()
      c.write(data, (c) => msg.send(c.message))
