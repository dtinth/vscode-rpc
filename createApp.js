const fs = require('fs')
const express = require('express')

function createApp(vscode, key) {
  const app = express()
  let lastMtime = 0

  app.use(`/${key}`, (req, res) => {
    req.vscode = vscode
    const mid = require.resolve('./handler')
    const mtime = +fs.statSync(mid).mtime
    if (mtime > lastMtime) {
      delete require.cache[mid]
      lastMtime = mtime
    }
    require(mid)(req, res)
  })

  app.get('/', (req, res) => {
    res.send(
      "Hello from <a href='https://github.com/dtinth/vscode-rpc'>vscode-rpc</a>",
    )
  })

  return app
}

module.exports = createApp
