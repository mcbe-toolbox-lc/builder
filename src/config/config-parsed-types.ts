type CommonPackConfigProps = {
	srcDir: string;
	targetDirs: string[];
};

export type BehaviorPackConfig = CommonPackConfigProps & {
	type: "behavior";
};

export type ResourcePackConfig = CommonPackConfigProps & {
	type: "resource";
};

export type PackConfig = BehaviorPackConfig | ResourcePackConfig;

export type Config = {
	behaviorPack?: BehaviorPackConfig;
	resourcePack?: ResourcePackConfig;
	customTmpDir?: string;
};
