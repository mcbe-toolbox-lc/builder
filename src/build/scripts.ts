import { isFileUrl } from "@/utils/url";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BehaviorPackScriptOptions } from "@/config/config-input-types";

export const SCRIPT_FILE_EXTENSIONS: readonly string[] = [
	// JavaScript
	".js",
	".cjs",
	".mjs",
	".jsx",
	// TypeScript
	".ts",
	".cts",
	".mts",
	".tsx",
];

const createCustomWritePlugin = (sourceRoot: string): esbuild.Plugin => {
	const onEnd = async (result: esbuild.BuildResult) => {
		if (!result.outputFiles) return;

		for (const outputFile of result.outputFiles) {
			let finalText: string;

			if (path.extname(outputFile.path) === ".map") {
				// Tweak source map contents to work with the Minecraft script debugger
				const data = JSON.parse(outputFile.text);
				const sources = data.sources as string[];
				data.sources = sources.map((value) => {
					const dir = path.dirname(outputFile.path);
					const absPath = path.resolve(dir, isFileUrl(value) ? fileURLToPath(value) : value);
					const relativePath = path.relative(sourceRoot, absPath);
					return relativePath;
				});

				finalText = JSON.stringify(data, null, 2);
			} else {
				finalText = outputFile.text;
			}

			await fs.outputFile(outputFile.path, finalText, "utf8");
		}
	};

	return {
		name: "custom-write",
		setup: (build) => {
			build.onEnd(onEnd);
		},
	};
};

const createEsbuildOptions = (
	sourceRoot: string,
	outDir: string,
	options: BehaviorPackScriptOptions,
): esbuild.BuildOptions => {
	let esbuildOpts: esbuild.BuildOptions = {
		outdir: outDir,
		tsconfig: options.tsconfig,
		format: "esm",
		write: false,
		plugins: [createCustomWritePlugin(sourceRoot)],
		platform: "node", // Minecraft uses QuickJS but development platform is Node.js
	};

	if (options.bundle) {
		esbuildOpts = {
			...esbuildOpts,
			entryPoints: [options.entry],
			bundle: true,
			minify: options.minify,
			external: ["@minecraft"],
		};
	} else {
		const entryPoints = path.relative(".", path.join(sourceRoot, "**", "*")).replaceAll("\\", "/");
		esbuildOpts = {
			...esbuildOpts,
			entryPoints: [entryPoints],
		};
	}

	if (options.sourceMap) {
		esbuildOpts = {
			...esbuildOpts,
			sourcemap: "linked",
			sourceRoot: sourceRoot,
		};
	}

	esbuildOpts = {
		...esbuildOpts,
		...options.esbuildOptions,
	};

	return esbuildOpts;
};

export const buildScripts = async (
	sourceRoot: string,
	outDir: string,
	options: BehaviorPackScriptOptions,
): Promise<esbuild.BuildResult> => {
	const esbuildOptions = createEsbuildOptions(sourceRoot, outDir, options);

	await fs.ensureDir(outDir);
	const result = await esbuild.build(esbuildOptions);
	await esbuild.stop();

	return result;
};
