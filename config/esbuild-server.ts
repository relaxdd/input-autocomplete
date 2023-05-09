import esbuild, { BuildOptions, Plugin } from 'esbuild'
import devConfig from './dev-config'
import { EventEmitter } from 'events'
import path from 'path'
import express from 'express'
import tsc from 'typescript'
import fs from 'fs'

const port = Number(process.env?.['PORT']) || 3000
const emmiter = new EventEmitter()
const app = express()

function runServer() {
	app.use(express.static(path.resolve(__dirname, '..')))

	app.get('/subscribe', (req, res) => {
		const headers = {
			'Content-Type': 'text/event-stream',
			'Connection': 'keep-alive',
			'Cache-Control': 'no-cache'
		}

		res.writeHead(200, undefined, headers)
		res.write('')

		emmiter.on('refresh', () => {
			res.write('data: message\n\n')
		})
	})

	app.listen(port, () => {
		console.log('[server]: the server has successfully started on http://localhost:' + port)
	})
}

function checkTypescript() {
	const json = fs.readFileSync(path.resolve(__dirname, '..', 'tsconfig.json')).toString()
	const { compilerOptions } = JSON.parse(json) as { [key: string]: any, compilerOptions: tsc.CompilerOptions }

	const program = tsc.createProgram([], { ...compilerOptions, noEmit: true })
	const emitResult = program.getTypeChecker()

	// console.log(emitResult.)
	process.exit(0)

	// const allDiagnostics = tsc
	// 	.getPreEmitDiagnostics(program)
	// 	.concat(emitResult.diagnostics)
	//
	// console.log(allDiagnostics)
	//
	// allDiagnostics.forEach((diagnostic) => {
	// 	if (diagnostic.file) {
	// 		const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
	// 			diagnostic.start!
	// 		)
	// 		const message = tsc.flattenDiagnosticMessageText(
	// 			diagnostic.messageText,
	// 			'\n'
	// 		)
	// 		console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
	// 	} else {
	// 		console.log(tsc.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
	// 	}
	// })
	//
	// const exitCode = emitResult.emitSkipped ? 1 : 0
	// console.log(`Process exiting with code ${exitCode}.`)
	// process.exit(exitCode)
}

function MyPlugin(): Plugin {
	let isInit = true

	return {
		name: 'MyPlugin',
		setup(builder) {
			builder.onStart(() => {

			})

			builder.onEnd(() => {
				if (isInit) {
					isInit = false
					return
				}

				console.log('[server]: files was changed, hot reload')
				emmiter.emit('refresh', '123131')
			})
		}
	}
}

(async function () {
	// checkTypescript()

	const config: BuildOptions = {
		...devConfig, plugins: [MyPlugin()]
	}

	runServer()

	try {
		const ctx = await esbuild.context(config)
		await ctx.watch()
		console.log('[watch] build finished, watching for changes...')
	} catch (err) {
		console.error(err)
		process.exit(1)
	}
})()

