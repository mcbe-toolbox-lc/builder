/**
 * Creates a Promise that resolves after the specified number of milliseconds.
 * @param ms - The number of milliseconds to wait.
 * @param unref - If true, the timer will not keep the Node.js event loop alive.
 * @returns A Promise that resolves after `ms`.
 */
export const delay = async (ms: number, unref = false): Promise<void> =>
	new Promise((resolve) => {
		const timeout = setTimeout(resolve, ms);

		if (unref) timeout.unref();
	});
