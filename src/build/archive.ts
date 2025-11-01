import type { ArchiveOptions } from "@/config/config-input-types";
import type { Logger } from "@/utils/logger";
import archiver from "archiver";
import fs from "fs-extra";
import path from "node:path";

export type ArchiveSource = {
	path: string;
	name: string;
};

export const createArchive = async (
	sources: ArchiveSource[],
	archiveOptions: ArchiveOptions,
	logger?: Logger,
	signal?: AbortSignal,
): Promise<void> => {
	const outputPath = archiveOptions.outFile;

	signal?.throwIfAborted();

	const outputDir = path.dirname(outputPath);
	await fs.ensureDir(outputDir);

	const output = fs.createWriteStream(outputPath);
	const archive = archiver("zip", {
		zlib: { level: archiveOptions.compressionLevel },
	});

	return new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			signal?.removeEventListener("abort", onAbort);
		};

		const onAbort = () => {
			archive.destroy();
			reject("Operation aborted.");
		};

		const onError = (err: Error) => {
			cleanup();
			reject(err);
		};

		signal?.addEventListener("abort", onAbort, { once: true });

		// Handle successful completion.
		output.on("close", () => {
			logger?.info(`Archive created: ${path.basename(outputPath)} (${archive.pointer()} bytes)`);
			cleanup();
			resolve();
		});

		// Handle errors from the writable stream.
		output.on("error", onError);

		archive.on("warning", (error) => {
			logger?.warn(`Archive creation warning: ${error.message}`);
		});

		// Handle errors from the archiver.
		archive.on("error", onError);

		archive.pipe(output);

		// Add each specified directory to the archive.
		for (const dir of sources) {
			archive.directory(dir.path, dir.name);
		}

		// Finalize the archive, signaling that no more files will be added.
		archive.finalize();
	});
};
