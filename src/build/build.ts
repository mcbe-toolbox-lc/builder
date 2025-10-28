import type { ConfigInput } from "@/config/config-input-types";
import type { Config } from "@/config/config-parsed-types";
import { parseConfig } from "@/config/parsing";
import { styleText } from "node:util";

const buildOperation = async (config: Config, signal?: AbortSignal): Promise<void> => {
	signal?.throwIfAborted();
};

/**
 * Builds the project based on the provided configuration.
 * @param config - Configuration object.
 * @param signal - Abort signal that aborts the operation.
 * @returns A Promise that resolves when the operation is completed. But if watch mode is enabled,
 * it will not resolve until it's aborted via `signal` (AbortSignal).
 */
export const build = async (config: ConfigInput, signal?: AbortSignal): Promise<void> => {
	if (signal?.aborted) {
		console.error(styleText("red", "The provided AbortSignal is already aborted."));
		return;
	}

	let parsedConfig: Config;
	try {
		parsedConfig = parseConfig(config);
	} catch (error) {
		console.error(styleText("red", `Failed to parse user provided configuration: ${error}`));
		return;
	}

	try {
		await buildOperation(parsedConfig, signal);
	} catch (error) {
		console.error(styleText("red", `Build failed: ${error}`));
	}
};
