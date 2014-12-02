module.exports = (robot) ->
  robot.respond /(llueve)(\?)?/i, (msg) ->
    msg.http('https://mazu-sinergia.herokuapp.com/')
      .get() (err, res, body) ->
        info = JSON.parse(body)
        if info.timestamp?
          d = new Date()
          now = d.getTime()

          if info.created_at > now - (60*5)
            msg.send "Si, #{info.mm}mm en los ultimos 5 minutos"
          else
            msg.send "No ultimamente"
        else
          msg.send "No, todo en orden ^_^"
