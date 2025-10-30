import { testInclusion } from "@/utils/inclusion";
import type { Logger } from "@/utils/logger";
import fs from "fs-extra";
import path from "node:path";
import type { PackConfig } from "./build-config";
import type { BuildExecutionContext } from "./build-system";

type Cache = {
	[filePath: string]: {
		timestamp: number;
	};
};

type FileChange = {
	type: "add" | "update" | "remove";
	filePath: string;
};

export class PackBuilder {
	private _lastCache: Cache = {};

	constructor(
		readonly config: PackConfig,
		readonly name: string,
		readonly logger: Logger,
	) {}

	async build(ctx: BuildExecutionContext): Promise<void> {
		try {
			this.logger.info("Building...");

			const { newCache } = await this.executeBuild(ctx);

			this.logger.info(`Build finished!`);

			if (newCache) {
				this._lastCache = newCache;
			}
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				this.logger.warn("Build aborted.");
			} else {
				this.logger.error(`Build failed: ${error}`);
				throw error;
			}
		}
	}

	private async executeBuild(ctx: BuildExecutionContext): Promise<{ newCache?: Cache }> {
		ctx.signal?.throwIfAborted();

		if (!fs.pathExists(this.config.srcDir)) {
			throw new Error(`Source directory not found at ${this.config.srcDir}`);
		}

		const { changes, newCache } = await this.detectSourceTreeChanges(ctx);

		if (changes.length <= 0) {
			this.logger.warn("No changes were detected.");
			return {};
		}

		return { newCache };
	}

	private async detectSourceTreeChanges(
		ctx: BuildExecutionContext,
	): Promise<{ changes: FileChange[]; newCache: Cache }> {
		const changes: FileChange[] = [];
		const newCache: Cache = {};
		const currentFiles = new Set<string>();

		const checkFileChanges = async (filePath: string) => {
			if (ctx.signal?.aborted) return;

			try {
				const stats = await fs.stat(filePath);
				currentFiles.add(filePath);
				const currentTimestamp = stats.mtimeMs;
				const cachedEntry = this._lastCache[filePath];

				if (!cachedEntry) {
					changes.push({ type: "add", filePath });
				} else if (cachedEntry.timestamp !== currentTimestamp) {
					changes.push({ type: "update", filePath });
				}
				newCache[filePath] = { timestamp: currentTimestamp };
			} catch (error) {
				this.logger.error(`Error checking file change of ${filePath}: ${error}`);
			}
		};

		const dirSearchQueue: string[] = [this.config.srcDir];
		while (dirSearchQueue.length > 0) {
			ctx.signal?.throwIfAborted();

			const dir = dirSearchQueue.shift()!;

			try {
				const entries = await fs.readdir(dir);
				const promises = entries.map(async (entry) => {
					const fullPath = path.join(dir, entry);
					if (!this.shouldInclude(fullPath)) return;

					const stats = await fs.stat(fullPath);
					if (stats.isDirectory()) {
						dirSearchQueue.push(fullPath);
					} else if (stats.isFile()) {
						await checkFileChanges(fullPath);
					}
				});
				await Promise.all(promises);
			} catch (error) {
				this.logger.error(`Error reading directory ${dir}: ${error}`);
			}
		}

		for (const filePath in this._lastCache) {
			if (!currentFiles.has(filePath)) {
				changes.push({ type: "remove", filePath });
			}
		}

		return { changes, newCache };
	}

	private shouldInclude(srcPath: string): boolean {
		const { srcDir, exclude, include } = this.config;
		return testInclusion(srcPath, srcDir, include, exclude);
	}
}
