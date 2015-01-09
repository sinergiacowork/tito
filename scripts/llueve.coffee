module.exports = (robot) ->
  robot.respond /(llueve)(\?)?/i, (msg) ->
    msg.http('https://mazu-sinergia.herokuapp.com/')
      .get() (err, res, body) ->
        info = JSON.parse(body)
        if info.timestamp?
          d = new Date()
          now = d.getTime()/1000
          last_5_min = now - (60*5)

          if info.timestamp >= last_5_min
            msg.send "Si, #{info.mm}mm en los ultimos 5 minutos"
          else
            msg.send "No ultimamente"
        else
          msg.send "No, todo en orden ^_^"
