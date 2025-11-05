import type { ConfigInput } from "@/config/config-input-types";
import { createLogger } from "@/utils/logger";
import JSON5 from "json5";
import packageConfig from "../../package.json";
import { resolveAndValidateUserConfig, type BuildConfig } from "./build-config";
import { BuildSystem, type BuildSystemContext } from "./build-system";
import { delay } from "@/utils/timeout";

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
		prefix: "COR",
		minLevel: configInput.logLevel,
	});

	logger.info(`Builder version: ${packageConfig.version}`);

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

	logger.debug(`Parsed config:\n${JSON5.stringify(buildConfig, null, 2)}`);

	let ctx: BuildSystemContext;
	try {
		ctx = await BuildSystem.createContext(buildConfig);
	} catch (error) {
		logger.error(`Failed to create build system context: ${error}`);
		return;
	}

	const buildSystem = new BuildSystem(ctx);

	logger.info("Initialized build system.");

	const onAbort = (reason: string) => {
		const callback = () => {
			process.off("SIGINT", onAbort);
			process.off("SIGTERM", onAbort);
			signal?.removeEventListener("SIGINT", callback);

			if (buildSystem.isClosed) return;

			logger.warn(`Aborting... (Reason: ${reason})`);

			buildSystem.close().then(() => {
				logger.info("Build system has been closed.");
			});
		};
		return callback;
	};

	process.once("SIGINT", onAbort("Keyboard Interrupt"));
	process.once("SIGTERM", onAbort("SIGTERM"));

	signal?.addEventListener("abort", onAbort("AbortSignal"), { once: true });

	try {
		await buildSystem.runAndClose();
	} catch (error) {
		logger.error(`Critical build system error: ${error}`);
		return;
	}

	await delay(5); // Wait a little bit

	const endSentences: string[] = [
		"*The builder has left the chat*",
		"*The builder has quit the game*",
		"*The builder has refused to elaborate further*",
		"*The builder went to workout*",
	];

	const randomIndex: number = Math.floor(Math.random() * endSentences.length);

	logger.success(endSentences[randomIndex]!);
};
