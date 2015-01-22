# Description
#   Acordate
#
# Commands:
#   hubot que es|acordate <key> - Returns a string
#   hubot acordate <key> es <value>. - Returns nothing. Remembers the text for next time!
#   hubot de que te acordas - Returns everything hubot remembers.
#   hubot olvidate <key> - Removes key from hubots brain.
#
# Dependencies:
#   "underscore": "*"

_ = require('underscore')

module.exports = (robot) ->
  memoriesByRecollection = () -> robot.brain.data.memoriesByRecollection ?= {}
  memories = () -> robot.brain.data.remember ?= {}

  findSimilarMemories = (key) ->
    searchRegex = new RegExp(key, 'i')
    Object.keys(memories()).filter (key) -> searchRegex.test(key)

  robot.respond /(?:(que|cual) es|acordate( de que)?)\s+(.*)(\\?)?/i, (msg) ->
    words = msg.match[3]
    if match = words.match /(.*?)(\s+es\s+([\s\S]*))$/i
      msg.finish()
      key = match[1].toLowerCase()
      value = match[3]
      currently = memories()[key]
      if currently
        msg.send "#{key} es #{currently}. Olvidate de #{key} primero."
      else
        memories()[key] = value
        msg.send "Bueno, me voy a acordar de #{key}."
    else if match = words.match /([^?]+)\??/i
      msg.finish()

      key = match[1].toLowerCase()
      value = memories()[key]

      if value
        memoriesByRecollection()[key] ?= 0
        memoriesByRecollection()[key]++
      else
        if match = words.match /\|\s*(grep\s+)?(.*)$/i
          searchPattern = match[2]
          matchingKeys = findSimilarMemories(searchPattern)
          if matchingKeys.length > 0
            value = "Me acuerdo de:\n#{matchingKeys.join('\n')}"
          else
            value = "No me acuerdo de nada como `#{searchPattern}`"
        else
          matchingKeys = findSimilarMemories(key)
          if matchingKeys.length > 0
            keys = matchingKeys.join('\n')
            value = "No me acuerdo de `#{key}`. Es: \n#{keys}"
          else
            value = "No me acuerdo de nada parecido a `#{key}`"

      msg.send value

  robot.respond /olvidate\s+(.*)/i, (msg) ->
    key = msg.match[1].toLowerCase()
    value = memories()[key]
    delete memories()[key]
    delete memoriesByRecollection()[key]
    msg.send "Me olvide de que #{key} es #{value}."

  robot.respond /de que te acordas(\?)?/i, (msg) ->
    msg.finish()
    keys = []
    keys.push key for key of memories()
    msg.send "Me acuerdo de:\n#{keys.join('\n')}"
