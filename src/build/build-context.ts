import type { ConfigInput } from "@/config/config-input-types";
import path from "node:path";

type CommonPackConfigProps = {
	srcDir: string;
	targetDirs: string[];
};

export type BPBuilderConfig = CommonPackConfigProps & {
	type: "behavior";
};

export type RPBuilderConfig = CommonPackConfigProps & {
	type: "resource";
};

export type PackBuilderConfig = BPBuilderConfig | RPBuilderConfig;

export type BuildConfig = {
	bpConfig?: BPBuilderConfig;
	rpConfig?: RPBuilderConfig;
	customTempDirRoot?: string;
};

export type BuildContext = {
	config: BuildConfig;
	signal?: AbortSignal;
};

const resolveTargetDir = (targetDir: string | string[]): string[] =>
	(Array.isArray(targetDir) ? targetDir : [targetDir]).map((x) => path.resolve(x));

export const resolveAndValidateUserConfig = (input: ConfigInput): BuildConfig => {
	const bpInput = input.behaviorPack;
	const rpInput = input.resourcePack;

	if (!bpInput && !rpInput) {
		throw new Error("Neither behavior pack nor resource pack is configured.");
	}

	const bpConfig: BPBuilderConfig | undefined = bpInput
		? {
				type: "behavior",
				srcDir: path.resolve(bpInput.srcDir),
				targetDirs: resolveTargetDir(bpInput.targetDir),
			}
		: undefined;

	const rpConfig: RPBuilderConfig | undefined = rpInput
		? {
				type: "resource",
				srcDir: path.resolve(rpInput.srcDir),
				targetDirs: resolveTargetDir(rpInput.targetDir),
			}
		: undefined;

	const customTempDirRoot = input.customTempDirRoot
		? path.resolve(input.customTempDirRoot)
		: undefined;

	const config: BuildConfig = {
		bpConfig,
		rpConfig,
		customTempDirRoot,
	};

	return config;
};

export const createBuildContext = (config: BuildConfig, signal?: AbortSignal): BuildContext => {
	return {
		config,
		signal,
	};
};
