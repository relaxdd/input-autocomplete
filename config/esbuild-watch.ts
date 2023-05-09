import esbuild, { BuildOptions } from 'esbuild'
import devConfig from "./dev-config";
import ShowLogPlugin from "./plugins/ShowLogPlugin";

const config: BuildOptions = {
	...devConfig,
	plugins: [ShowLogPlugin]
};

(async function () {
	const ctx = await esbuild.context(config)
	await ctx.watch()
	console.log("[watch] build finished, watching for changes...")
})()
