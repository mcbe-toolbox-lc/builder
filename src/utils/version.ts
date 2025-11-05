/** Basic structure of package.json object */
type PackageConfigLike = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

/** Extracts properties with keys starting with '@minecraft/*' from type T */
type ExtractMinecraftPackages<T> = {
	[K in keyof T as K extends `@minecraft/${string}` ? K : never]: T[K];
};

/** Defines the type of `@minecraft/*` packages and their versions, dependent on the package.json type T */
type MinecraftPackageVersions<T extends PackageConfigLike> = ExtractMinecraftPackages<
	NonNullable<T["dependencies"]>
> &
	ExtractMinecraftPackages<NonNullable<T["devDependencies"]>>;

/**
 * Extracts Minecraft-related package versions from a package.json object.
 * @param packageConfig - package.json configuration object.
 * @returns An object containing version information of (dev) dependencies under the scope `@minecraft`.
 */
export const getMinecraftPackageVersions = <T extends PackageConfigLike>(
	packageConfig: T,
): MinecraftPackageVersions<T> => {
	// Merge dependencies and devDependencies (use empty objects if not present)
	const allDependencies = {
		...(packageConfig.dependencies ?? {}),
		...(packageConfig.devDependencies ?? {}),
	};

	// Filter dependencies with keys starting with '@minecraft/*'
	const minecraftEntries = Object.entries(allDependencies).filter(([key]) =>
		key.startsWith("@minecraft/"),
	);

	return Object.fromEntries(minecraftEntries) as MinecraftPackageVersions<T>;
};

/**
 * Parses a version string into a number array.
 * @param versionString - Version string with the `major.minor.patch` format, such as `0.6.9`.
 * @returns An array of version numbers: `[major, minor, patch]`
 * @throws {Error} If the format is invalid or parts aren't integers.
 */
export const parseVersionString = (versionString: string): number[] => {
	// Split into parts.
	const parts = versionString.split(".");

	if (parts.length !== 3) {
		throw new Error(
			'Invalid format: The string must contain exactly three integer parts separated by dots (e.g., "1.2.3").',
		);
	}

	const numbers = parts.map((part) => {
		const num = Number(part);

		if (part.trim() === "" || !Number.isInteger(num)) {
			throw new Error(`Invalid format: The segment "${part}" is not a valid integer.`);
		}

		return num;
	});

	return numbers;
};
