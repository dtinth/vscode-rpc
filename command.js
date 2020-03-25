const createApp = require('./createApp')

exports.execute = async args => {
  const vscode = args.require('vscode')
  if (global.dtinthRPC) {
    vscode.window
      .showInformationMessage(
        `RPC server is already running...`,
        'Stop Server',
        'Open',
        'Copy URL',
      )
      .then(async response => {
        if (response === 'Stop Server') {
          global.dtinthRPC.dispose()
          delete global.dtinthRPC
        } else if (response === 'Open') {
          await vscode.env.openExternal(global.dtinthRPC.url)
        } else if (response === 'Copy URL') {
          await vscode.env.clipboard.writeText(global.dtinthRPC.url)
        } else if (response) {
          throw new Error('Unknown response: ' + response)
        }
      })
      .catch(e => {
        vscode.window.showErrorMessage(`${e}`)
      })
  } else {
    const key = require('crypto')
      .randomBytes(20)
      .toString('hex')
    const server = await new Promise((resolve, reject) => {
      const server = createApp(vscode, key).listen(0, 'localhost')
      server.on('listening', () => resolve(server))
      server.on('error', reject)
    })
    const port = server.address().port
    const url = `http://localhost:${port}/${key}`
    vscode.window
      .showInformationMessage(
        `RPC server started at ${url}`,
        'Open',
        'Copy URL',
      )
      .then(async response => {
        if (response === 'Open') {
          await vscode.env.openExternal(global.dtinthRPC.url)
        } else if (response === 'Copy URL') {
          await vscode.env.clipboard.writeText(global.dtinthRPC.url)
        } else if (response) {
          throw new Error('Unknown response: ' + response)
        }
      })
      .catch(e => {
        vscode.window.showErrorMessage(`${e}`)
      })
    global.dtinthRPC = {
      url,
      dispose() {
        server.close(() => {
          vscode.window.showInformationMessage(`Server closed`)
        })
      },
    }
  }
}
