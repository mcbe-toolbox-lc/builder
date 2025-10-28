import path from "node:path";
import type { ConfigInput } from "./config-input-types";
import type { Config } from "./config-parsed-types";

const resolveTargetDirs = (targetDirs: string | string[]): string[] =>
	(Array.isArray(targetDirs) ? targetDirs : [targetDirs]).map((x) => path.resolve(x));

export const parseConfig = (input: ConfigInput): Config => {
	const bpCfg = input.behaviorPack;
	const rpCfg = input.resourcePack;

	if (!bpCfg && !rpCfg) {
		throw new Error("Neither behavior pack nor resource pack is configured.");
	}

	const config: Config = {};

	if (bpCfg) {
		config.behaviorPack = {
			type: "behavior",
			srcDir: path.resolve(bpCfg.srcDir),
			targetDirs: resolveTargetDirs(bpCfg.targetDir),
		};
	}

	if (rpCfg) {
		config.resourcePack = {
			type: "resource",
			srcDir: path.resolve(rpCfg.srcDir),
			targetDirs: resolveTargetDirs(rpCfg.targetDir),
		};
	}

	if (input.tempDir) config.customTmpDir = path.resolve(input.tempDir);

	return config;
};
