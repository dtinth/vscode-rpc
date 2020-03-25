const express = require('express')
const { ApolloServer, gql } = require('apollo-server-express')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    env: Env!
    window: Window!
    workspace: Workspace!
  }

  type Env {
    appName: String!
    appRoot: String!
    language: String!
    machineId: String!
    remoteName: String
    sessionId: String!
    shell: String!
    uiKind: Int!
    uriScheme: String!
  }

  type Window {
    activeTerminal: Terminal
    activeTextEditor: TextEditor
    state: WindowState!
    terminals: [Terminal]!
    visibleTextEditors: [TextEditor]!
  }
  type WindowState {
    focused: Boolean
  }
  type Terminal {
    exitStatus: TerminalExitStatus
    name: String!
    processId: Int
  }
  type TerminalExitStatus {
    code: Int!
  }
  type TextEditor {
    document: TextDocument!
    selection: Selection!
    selections: [Selection]!
    viewColumn: Int
    visibleRanges: [Range]!
  }
  type TextDocument {
    eol: Int!
    fileName: String!
    isClosed: Boolean!
    isDirty: Boolean!
    isUntitled: Boolean!
    languageId: String!
    lineCount: Int!
    uri: Uri!
    version: Int!
  }
  type Selection {
    active: Position!
    anchor: Position!
    end: Position!
    isEmpty: Boolean!
    isReversed: Boolean!
    isSingleLine: Boolean!
    start: Position!
  }
  type Range {
    end: Position!
    isEmpty: Boolean!
    isSingleLine: Boolean!
    start: Position!
  }
  type Position {
    character: Int!
    line: Int!
  }
  type Uri {
    authority: String!
    fragment: String!
    fsPath: String!
    path: String!
    query: String!
    scheme: String!
  }

  type Workspace {
    name: String
    rootPath: String
    textDocuments: [TextDocument]!
    workspaceFile: Uri
    workspaceFolders: [WorkspaceFolder]
  }
  type WorkspaceFolder {
    index: Int!
    name: String!
    uri: Uri!
  }

  type Mutation {
    insertText(text: String!): Boolean
    eval(code: String!): EvalResult
  }
  type EvalResult {
    result: String
    log: [String]!
    error: EvalError
  }
  type EvalError {
    message: String!
    stack: String!
  }
`

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    env: async (parent, args, context) => {
      return context.vscode.env
    },
    window: async (parent, args, context) => {
      return context.vscode.window
    },
    workspace: async (parent, args, context) => {
      return context.vscode.workspace
    },
  },
  Mutation: {
    insertText: async (parent, args, context) => {
      const editor = context.vscode.window.activeTextEditor
      return editor.edit(e => e.replace(editor.selection, args.text))
    },
    eval: async (parent, args, context) => {
      const log = []
      try {
        const fn = require('vm').compileFunction(
          `return eval(${JSON.stringify(args.code)})`,
          ['vscode', 'require', 'log', 'context'],
        )
        const result = await fn(
          ...[
            context.vscode,
            require,
            (...args) => log.push(require('util').format(...args)),
            context,
          ],
        )
        return {
          log,
          result:
            typeof result === 'string'
              ? result
              : require('util').inspect(result),
        }
      } catch (error) {
        return {
          log,
          error: {
            message: String((error && error.message) || error),
            stack: String((error && error.stack) || error),
          },
        }
      }
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  tracing: true,
  context: ({ req }) => ({
    vscode: req.vscode,
  }),
})

const app = express()
server.applyMiddleware({ app, path: '/', cors: true })

module.exports = app
