/**
 * Retrieves the value of a specific environment variable.
 * @param key - The name (key) of the environment variable to retrieve (e.g., 'NODE_ENV').
 * @returns The value associated with the key, or `undefined` if the environment variable is not set.
 */
export const getEnv = (key: string): string | undefined => process.env[key];

/**
 * Retrieves the value of a specific environment variable, providing a default value if it is not set.
 * @param key - The name (key) of the environment variable to retrieve (e.g., 'NODE_ENV').
 * @param fallback - The default value to return if the environment variable is not found or is empty.
 * @returns The value associated with the key, or the provided fallback string.
 */
export const getEnvWithFallback = (key: string, fallback: string): string =>
	process.env[key] ?? fallback;

/**
 * Retrieves the value of a specific environment variable, throwing an error if it's not set.
 * @param key - The name (key) of the environment variable to retrieve (e.g., 'NODE_ENV').
 * @param customErrorMsg - An optional custom error message to throw if the environment variable is missing.
 * @returns The non-null/undefined value of the environment variable.
 * @throws {Error} If the environment variable is not defined or is not a string.
 */
export const getEnvRequired = (key: string, customErrorMsg?: string): string => {
	const value = process.env[key];
	if (typeof value !== "string")
		throw new Error(customErrorMsg ?? `The environment variable '${key}' is required but not set.`);
	return value;
};
