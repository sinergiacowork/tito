# Description
#   Riley judges
#
# Commands:
#   hubot riley approves - Riley esta de acuerdo
#   hubot riley disapproves - Riley no esta de acuerdo

module.exports = (robot) ->
  robot.respond /(riley approves)(\!)?/i, (msg) ->
    msg.send "http://share.elcuervo.net/5Dlw82C3/B3Je3KDr.png?" + new Date().getTime();

  robot.respond /(riley disapproves)(\!)?/i, (msg) ->
    msg.send "http://share.elcuervo.net/RMvuJk9h/srSUT1ZD.png?" + new Date().getTime();
