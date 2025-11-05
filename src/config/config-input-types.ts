import type { LogLevel } from "@/types/misc";
import type * as esbuild from "esbuild";

type CommonPackConfigProps = {
	/** Specifies the source directory of the pack. */
	srcDir: string;
	/**
	 * Specifies the destination where the final output will be copied.
	 *
	 * Builder will first perform all work in a temporary directory and then copy the output.
	 */
	targetDir: string | string[];
	/**
	 * A custom pack manifest object that will be stringified to JSON and written to `manifest.json`
	 * at the top of the output directory.
	 */
	manifest?: Record<string, unknown>;
	/** An array of glob patterns or file paths to explicitly __include__ in the build. */
	include?: string[];
	/** An array of glob patterns or file paths to explicitly __exclude__ from the build. */
	exclude?: string[];
};

export type BehaviorPackScriptOptions = {
	/** Specifies the path to the main behavior pack script file. */
	entry: string;
	/**
	 * Whether to bundle referenced scripts into one file. Enable this if you want to use
	 * third-party npm packages in your scripts.
	 * @default false
	 */
	bundle?: boolean;
	/**
	 * Whether to minify scripts for less file size. Only applicable when `bundle` is true.
	 * __Can be buggy!__
	 * @default false
	 */
	minify?: boolean;
	/**
	 * Whether to generate source maps alongside compilation. Enable this if you need to debug
	 * TypeScript using [the Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=mojang-studios.minecraft-debugger).
	 * @default false
	 */
	sourceMap?: boolean;
	/**
	 * Specifies the path to the tsconfig file. You don't need to specify if you have the file at
	 * the standard location `(project-root)/tsconfig.json`.
	 */
	tsconfig?: string;
	/** Override common esbuild options. */
	esbuildOptions?: esbuild.CommonOptions;
};

export type BehaviorPackConfigInput = CommonPackConfigProps & {
	/** Options related to compilation of behavior pack scripts. */
	scripts?: BehaviorPackScriptOptions;
};

export type ResourcePackConfigInput = CommonPackConfigProps & {
	// TODO: Resource pack-specific properties
};

export type ArchiveOptions = {
	/** Specifies where the generated archive file will be saved. */
	outFile: string;
	/**
	 * Specifies the archive compression level.
	 * @default 9
	 */
	compressionLevel?: number;
};

export type ConfigInput = {
	/**
	 * Configures the behavior pack.
	 * Leave this undefined if you don't need behavior pack.
	 */
	behaviorPack?: BehaviorPackConfigInput;
	/**
	 * Configures the resource pack.
	 * Leave this undefined if you don't need resource pack.
	 */
	resourcePack?: ResourcePackConfigInput;
	/**
	 * Specifies how one or more archive files will be generated from the final output packs.
	 *
	 * You can use this to create distributable files with extensions like `.mcpack` and `.mcaddon`.
	 */
	archive?: ArchiveOptions | ArchiveOptions[];
	/**
	 * Specifies the directory that will contain a temporary directory.
	 * By default, builder will use the system's temporary directory prefix.
	 */
	customTempDirRoot?: string;
	/**
	 * Sets the logging verbosity level.
	 * To completely silent the logs, set this to `silent`.
	 * @default "info"
	 */
	logLevel?: LogLevel;
	/**
	 * When this is enabled and the initial build step completes, builder will "watch" for file
	 * changes in the background. If it detects a file change, it will trigger rebuild.
	 * @default false
	 */
	watch?: boolean;
};
