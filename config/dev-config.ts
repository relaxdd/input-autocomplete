import { BuildOptions } from "esbuild";
import path from "path";

const devConfig: BuildOptions = {
	outdir: "dist",
	sourcemap: "inline",
	entryPoints: [path.resolve(__dirname, "..", "src", "autocomplete.ts")],
	tsconfig: path.resolve(__dirname, "tsconfig.json"),
	// bundle: true
}

export default devConfig