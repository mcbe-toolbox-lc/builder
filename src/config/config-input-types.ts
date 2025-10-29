type CommonPackConfigProps = {
	/** Specifies the source directory of the pack. */
	srcDir: string;
	/**
	 * Specifies the final output target directories.
	 * Builder will first perform all work in a temporary directory and then copies the output to
	 * the directory specified by this property.
	 */
	targetDir: string | string[];
};

export type BehaviorPackConfigInput = CommonPackConfigProps & {
	// TODO: Behavior pack-specific properties
};

export type ResourcePackConfigInput = CommonPackConfigProps & {
	// TODO: Resource pack-specific properties
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
	 * Specifies the directory that will contain a temporary directory.
	 * By default, builder will use the system's temporary directory prefix.
	 */
	customTempDirRoot?: string;
};
