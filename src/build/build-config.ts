import type { ConfigInput } from "@/config/config-input-types";
import type { LogLevel } from "@/types/misc";
import path from "node:path";

type CommonPackConfigProps = {
	srcDir: string;
	targetDirs: string[];
	include?: string[];
	exclude?: string[];
};

export type BPConfig = CommonPackConfigProps & {
	type: "behavior";
};

export type RPConfig = CommonPackConfigProps & {
	type: "resource";
};

export type PackConfig = BPConfig | RPConfig;

export type BuildConfig = {
	bpConfig?: BPConfig;
	rpConfig?: RPConfig;
	customTempDirRoot?: string;
	logLevel?: LogLevel;
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
				include: bpInput.include,
				exclude: bpInput.exclude,
			}
		: undefined;

	const rpConfig: RPConfig | undefined = rpInput
		? {
				type: "resource",
				srcDir: path.resolve(rpInput.srcDir),
				targetDirs: resolveTargetDir(rpInput.targetDir),
				include: rpInput.include,
				exclude: rpInput.exclude,
			}
		: undefined;

	const customTempDirRoot = input.customTempDirRoot
		? path.resolve(input.customTempDirRoot)
		: undefined;

	const logLevel: LogLevel = input.logLevel ?? "info";

	const config: BuildConfig = {
		bpConfig,
		rpConfig,
		customTempDirRoot,
		logLevel,
	};

	return config;
};
