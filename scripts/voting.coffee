# Description
#   Vote on stuff!
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot empezar votacion item1, item2, item3, ...
#   hubot voto por N - votar por opcion
#   hubot mostrar opciones
#   hubot mostrar votos - Muestra votos
#   hubot finalizar votacion
#
# Notes:
#   None
#
# Author:
#   antonishen

module.exports = (robot) ->
  robot.voting = {}

  robot.respond /empezar votacion (.+)$/i, (msg) ->

    if robot.voting.votes?
      msg.send "Hay una votacion activa"
      sendChoices (msg)
    else
      robot.voting.votes = {}
      createChoices msg.match[1]

      msg.send "Votacion empezada"
      sendChoices(msg)

  robot.respond /finalizar votacion/i, (msg) ->
    if robot.voting.votes?
      console.log robot.voting.votes

      results = tallyVotes()

      response = "Los resultados son..."
      for choice, index in robot.voting.choices
        response += "\n#{choice}: #{results[index]}"

      msg.send response

      delete robot.voting.votes
      delete robot.voting.choices
    else
      msg.send "No hay una votacion para finalizar"


  robot.respond /mostrar opciones/i, (msg) ->
    sendChoices(msg)

  robot.respond /mostrar votos/i, (msg) ->
    results = tallyVotes()
    sendChoices(msg, results)

  robot.respond /voto (por )?(.+)$/i, (msg) ->
    choice = null

    re = /\d{1,2}$/i
    if re.test(msg.match[2])
      choice = parseInt(msg.match[2], 10) - 1
    else
      choice = robot.voting.choices.indexOf msg.match[2]

    console.log choice

    sender = robot.brain.usersForFuzzyName(msg.message.user['name'])[0].name

    if validChoice choice
      robot.voting.votes[sender] = choice
      msg.send "#{sender} voto por #{robot.voting.choices[choice]}"
    else
      msg.send "#{sender}: Esa no es una opcion valida"

  createChoices = (rawChoices) ->
    robot.voting.choices = rawChoices.split(/, /)

  sendChoices = (msg, results = null) ->

    if robot.voting.choices?
      response = ""
      for choice, index in robot.voting.choices
        response += "#{index + 1}: #{choice}"
        if results?
          response += " -- Votos totales: #{results[index]}"
        response += "\n" unless index == robot.voting.choices.length - 1
    else
      msg.send "No hay una votacion en este momento"

    msg.send response

  validChoice = (choice) ->
    numChoices = robot.voting.choices.length - 1
    0 <= choice <= numChoices

  tallyVotes = () ->
    results = (0 for choice in robot.voting.choices)

    voters = Object.keys robot.voting.votes
    for voter in voters
      choice = robot.voting.votes[voter]
      results[choice] += 1

    results
