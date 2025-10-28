import type { ConfigInput } from "@/config/config-input-types";
import type { Config } from "@/config/config-parsed-types";
import { parseConfig } from "@/config/parsing";

const _build = async (config: Config, signal?: AbortSignal): Promise<void> => {};

/**
 * Builds the project based on the provided configuration.
 * @param config - Configuration object.
 * @param signal - Abort signal that aborts the build process.
 */
export const build = async (config: ConfigInput, signal?: AbortSignal): Promise<void> => {
	const parsedConfig = parseConfig(config);

	await _build(parsedConfig, signal);
};
