module.exports = (robot) ->
  robot.respond /(llueve)(\?)?/i, (msg) ->
    msg.http('https://mazu-sinergia.herokuapp.com/')
      .get() (err, res, body) ->
        info = JSON.parse(body)
        if info.created_at?
          msg.send "Si, #{info.mm}mm en los ultimos 5 minutos"
        else
          msg.send "No, todo en orden ^_^"
