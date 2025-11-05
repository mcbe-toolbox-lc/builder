import { testInclusion } from "@/utils/inclusion";
import type { Logger } from "@/utils/logger";
import fs from "fs-extra";
import JSON5 from "json5";
import path from "node:path";
import type { PackConfig } from "./build-config";
import type { BuildExecutionContext, BuildSystemContext } from "./build-system";
import { buildScripts, SCRIPT_FILE_EXTENSIONS } from "./scripts";

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
	readonly outDir: string;
	private lastCache: Cache = {};

	constructor(
		buildSystemCtx: BuildSystemContext,
		readonly config: PackConfig,
		private readonly name: string,
		private readonly logger: Logger,
	) {
		this.outDir = path.join(buildSystemCtx.tempDir.path, this.name);
	}

	async build(ctx: BuildExecutionContext): Promise<void> {
		try {
			const { newCache } = await this.executeBuild(ctx);

			this.logger.debug(`Pack build finished successfully.`);

			if (newCache) {
				this.lastCache = newCache;
			}
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				this.logger.warn("Pack build aborted.");
			} else {
				this.logger.error(`Pack build failed: ${error}`);
			}
			throw error;
		}
	}

	private async executeBuild(ctx: BuildExecutionContext): Promise<{ newCache?: Cache }> {
		ctx.signal?.throwIfAborted();

		if (!fs.pathExists(this.config.srcDir)) {
			throw new Error(`Source directory not found at ${this.config.srcDir}`);
		}

		await fs.ensureDir(this.outDir);

		this.logger.debug("Detecting source tree changes...");

		const { changes, newCache } = await this.detectSourceTreeChanges(ctx);

		if (changes.length <= 0) {
			this.logger.debug("No changes detected.");
			return {};
		}

		const fileProcessingPromises: Promise<void>[] = [];

		let shouldBundleScripts = false;

		for (const change of changes) {
			const extname = path.extname(change.filePath);

			if (
				!shouldBundleScripts &&
				this.config.type === "behavior" &&
				this.config.scripts &&
				SCRIPT_FILE_EXTENSIONS.includes(extname)
			) {
				shouldBundleScripts = true;
				continue; // Let the bundler handle script files
			}

			fileProcessingPromises.push(this.applyFileChange(ctx, change));
		}

		this.logger.debug(`Applying ${fileProcessingPromises.length} file changes...`);
		try {
			await Promise.all(fileProcessingPromises);
		} catch (error) {
			throw new Error(`Failed to apply file changes: ${error}`);
		}

		try {
			await this.compileScriptsIfNeeded(shouldBundleScripts);
		} catch (error) {
			throw new Error(`Failed to compile scripts: ${error}`);
		}

		const targetDirs = this.config.targetDirs;
		if (targetDirs.length > 0) {
			this.logger.debug(`Copying the output to ${targetDirs.length} target directory(s)...`);
			try {
				await this.copyOutputToTargetDirs(ctx);
			} catch (error) {
				// Copy failure is not critical, so don't throw.
				this.logger.error(`Failed to copy output to target dirs: ${error}`);
			}
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
				const cachedEntry = this.lastCache[filePath];

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

					const shouldCheck = !ctx.limitCheckPaths || ctx.limitCheckPaths.has(fullPath);

					const stats = await fs.stat(fullPath);
					if (stats.isDirectory()) {
						dirSearchQueue.push(fullPath);
					} else if (stats.isFile() && shouldCheck) {
						await checkFileChanges(fullPath);
					}
				});
				await Promise.all(promises);
			} catch (error) {
				this.logger.error(`Error reading directory ${dir}: ${error}`);
			}
		}

		for (const filePath in this.lastCache) {
			if (ctx.limitCheckPaths && !ctx.limitCheckPaths.has(filePath)) break;
			if (!currentFiles.has(filePath)) {
				changes.push({ type: "remove", filePath });
			}
		}

		return { changes, newCache };
	}

	private async applyFileChange(ctx: BuildExecutionContext, change: FileChange): Promise<void> {
		ctx.signal?.throwIfAborted();

		const srcPath = change.filePath;
		const extname = path.extname(srcPath);
		const convertJson5 = extname === ".jsonc" || extname === ".json5";

		const destFileExt = convertJson5 ? ".json" : undefined;
		const destPath = this.getDestPath(change.filePath, destFileExt);
		const destDir = path.dirname(destPath);

		if (change.type === "remove") {
			if (await fs.pathExists(destPath)) {
				await fs.rm(destPath);
				this.recursivelyRemoveDirIfEmpty(destDir, this.outDir);
			}
			return;
		}

		// Convert JSON5/JSONC to plain JSON
		if (convertJson5) {
			const srcContent = await fs.readFile(srcPath);
			const original = srcContent.toString("utf8");
			const json = JSON.stringify(JSON5.parse(original), null, 2);
			await fs.outputFile(destPath, json);
			return;
		}

		await fs.ensureDir(destDir);
		await fs.copy(srcPath, destPath);
	}

	private async recursivelyRemoveDirIfEmpty(dir: string, stopAt: string): Promise<void> {
		dir = path.resolve(dir);
		stopAt = path.resolve(stopAt);
		if (dir === stopAt) return;
		if ((await fs.readdir(dir)).length > 0) return;
		await fs.rmdir(dir);

		const parent = path.dirname(dir);
		this.recursivelyRemoveDirIfEmpty(parent, stopAt);
	}

	private async compileScriptsIfNeeded(shouldBundle: boolean): Promise<void> {
		if (!shouldBundle || this.config.type !== "behavior" || !this.config.scripts) return;

		this.logger.debug("Compiling scripts...");

		const sourceRoot = path.join(this.config.srcDir, "scripts");
		const outDir = path.join(this.outDir, "scripts");
		await fs.rm(outDir, { recursive: true, force: true });
		await buildScripts(sourceRoot, outDir, this.config.scripts);
	}

	private async copyOutputToTargetDirs(ctx: BuildExecutionContext): Promise<void> {
		if (!(await fs.pathExists(this.outDir))) return;
		const promises = this.config.targetDirs.map(async (targetDir) => {
			await fs.rm(targetDir, { recursive: true, force: true });
			await fs.ensureDir(targetDir);
			await fs.copy(this.outDir, targetDir);
			this.logger.debug(`Copied to ${targetDir}`);
		});
		await Promise.all(promises);
	}

	private getDestPath(srcPath: string, destFileExt?: string): string {
		const srcDir = this.config.srcDir;
		const parsedSrcPath = path.parse(srcPath);

		if (destFileExt !== undefined) {
			parsedSrcPath.base = `${parsedSrcPath.name}${destFileExt}`;
		}

		const relativePath = path.relative(srcDir, path.format(parsedSrcPath));
		return path.join(this.outDir, relativePath);
	}

	shouldInclude(srcPath: string): boolean {
		const { srcDir, exclude, include } = this.config;
		return testInclusion(srcPath, srcDir, include, exclude);
	}

	isFilePartOfSrc(filePath: string): boolean {
		return path.resolve(filePath).startsWith(this.config.srcDir);
	}
}
