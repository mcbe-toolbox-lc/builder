import type { LogLevel } from "@/types/misc";

type CommonPackConfigProps = {
	/** Specifies the source directory of the pack. */
	srcDir: string;
	/**
	 * Specifies the destination where the final output will be copied.
	 *
	 * Builder will first perform all work in a temporary directory and then copy the output.
	 */
	targetDir: string | string[];
	/** An array of glob patterns or file paths to explicitly __include__ in the build. */
	include?: string[];
	/** An array of glob patterns or file paths to explicitly __exclude__ from the build. */
	exclude?: string[];
};

export type BehaviorPackConfigInput = CommonPackConfigProps & {
	// TODO: Behavior pack-specific properties
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
