# Description:
#   Sings a song
#
# Commands:
#   hubot sing me a song


song = (msg) ->
  query = msg.match[3]
  robot.http("http://gdata.youtube.com/feeds/api/videos")
    .query({
      orderBy: "relevance"
      'max-results': 1
      alt: 'json'
      q: query
    })
    .get() (err, res, body) ->
      videos = JSON.parse(body)
      videos = videos.feed.entry

      unless videos?
        msg.send "No video results for \"#{query}\""
        return

      video  = msg.random videos
      video.link.forEach (link) ->
        if link.rel is "alternate" and link.type is "text/html"
          msg.send link.href

module.exports = (robot) ->
  robot.respond /sing me a song$/i, song
  robot.respond /cantame una cancion$/i, song
