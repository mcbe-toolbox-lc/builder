import type { ConfigInput } from "@/config/config-input-types";
import { createLogger } from "@/utils/logger";
import { BuildSystem, type BuildSystemContext } from "./build-system";
import { resolveAndValidateUserConfig, type BuildConfig } from "./build-config";

/**
 * Asynchronously builds the project based on the configuration.
 * @param configInput - Build configuration object.
 * @param options - Optional settings for the build operation.
 */
export const build = async (
	configInput: ConfigInput,
	options: { signal?: AbortSignal } = {},
): Promise<void> => {
	const { signal } = options;

	const logger = createLogger({
		prefix: "MAIN",
		minLevel: configInput.logLevel,
	});

	if (signal?.aborted) {
		logger.error("The provided signal is already aborted.");
		return;
	}

	let buildConfig: BuildConfig;
	try {
		buildConfig = resolveAndValidateUserConfig(configInput);
	} catch (error) {
		logger.error(`Failed to validate the provided config: ${error}`);
		return;
	}

	let packCount = 0;
	if (buildConfig.bpConfig) packCount++;
	if (buildConfig.rpConfig) packCount++;

	logger.info(`Packs: ${packCount}`);

	let ctx: BuildSystemContext;
	try {
		ctx = await BuildSystem.createContext(buildConfig);
	} catch (error) {
		logger.error(`Failed to create build system context: ${error}`);
		return;
	}

	const buildSystem = new BuildSystem(ctx);

	const onAbort = () => {
		process.off("SIGINT", onAbort);
		process.off("SIGTERM", onAbort);
		signal?.removeEventListener("SIGINT", onAbort);

		if (buildSystem.isClosed) return;

		buildSystem.close();

		logger.error(`Build aborted.`);
	};

	process.once("SIGINT", onAbort);
	process.once("SIGTERM", onAbort);

	signal?.addEventListener("abort", onAbort, { once: true });

	try {
		await buildSystem.runAndClose();
	} catch (error) {
		logger.error(`Unexpected build system error: ${error}`);
		throw error;
	}
};
