import type {
	ArchiveOptions,
	BehaviorPackScriptOptions,
	ConfigInput,
} from "@/config/config-input-types";
import type { LogLevel } from "@/types/misc";
import path from "node:path";

type CommonPackConfigProps = {
	srcDir: string;
	targetDirs: string[];
	manifest?: Record<string, unknown>;
	include?: string[];
	exclude?: string[];
};

export type BPConfig = CommonPackConfigProps & {
	type: "behavior";
	scripts?: BehaviorPackScriptOptions;
};

export type RPConfig = CommonPackConfigProps & {
	type: "resource";
	generateTextureList: boolean;
};

export type PackConfig = BPConfig | RPConfig;

export type BuildConfig = {
	bpConfig?: BPConfig;
	rpConfig?: RPConfig;
	archives: ArchiveOptions[];
	customTempDirRoot?: string;
	logLevel?: LogLevel;
	watch?: boolean;
};

const resolveTargetDir = (targetDir: string | string[]): string[] =>
	(Array.isArray(targetDir) ? targetDir : [targetDir]).map((x) => path.resolve(x));

export const resolveAndValidateUserConfig = (input: ConfigInput): BuildConfig => {
	const bpInput = input.behaviorPack;
	const rpInput = input.resourcePack;

	if (!bpInput && !rpInput) {
		throw new Error("Neither behavior pack nor resource pack is configured.");
	}

	const bpConfig: BPConfig | undefined = bpInput
		? {
				type: "behavior",
				srcDir: path.resolve(bpInput.srcDir),
				targetDirs: resolveTargetDir(bpInput.targetDir),
				manifest: bpInput.manifest,
				include: bpInput.include,
				exclude: bpInput.exclude,
				scripts: bpInput.scripts,
			}
		: undefined;

	const rpConfig: RPConfig | undefined = rpInput
		? {
				type: "resource",
				srcDir: path.resolve(rpInput.srcDir),
				targetDirs: resolveTargetDir(rpInput.targetDir),
				manifest: rpInput.manifest,
				include: rpInput.include,
				exclude: rpInput.exclude,
				generateTextureList: rpInput.generateTextureList ?? false,
			}
		: undefined;

	const archives: ArchiveOptions[] = (
		Array.isArray(input.archive)
			? input.archive
			: input.archive !== undefined
				? [input.archive]
				: []
	).map((x) => ({
		outFile: path.resolve(x.outFile),
		compressionLevel: Math.floor(x.compressionLevel ?? 9),
	}));

	const customTempDirRoot = input.customTempDirRoot
		? path.resolve(input.customTempDirRoot)
		: undefined;

	const logLevel: LogLevel = input.logLevel ?? "info";

	const config: BuildConfig = {
		bpConfig,
		rpConfig,
		archives,
		customTempDirRoot,
		logLevel,
		watch: input.watch,
	};

	return config;
};
