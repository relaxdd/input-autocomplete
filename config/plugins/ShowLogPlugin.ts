import { Plugin } from 'esbuild'

function ShowLogPlugin(): Plugin {
	let isInit = false

	function log(text: string) {
		console.log('[watch] ' + text)
	}

	return {
		name: 'ShowLogPlugin',

		setup(build) {
			build.onStart(() => {
				if (isInit) return
				log('start building...')
			})

			build.onEnd((result) => {
				if (isInit) {
					isInit = false
					return
				}

				console.log(result?.outputFiles?.[0])
				log('finish building.')
			})
		}
	}
}

export default ShowLogPlugin()