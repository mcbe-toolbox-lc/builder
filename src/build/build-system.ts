import { createLogger, type Logger } from "@/utils/logger";
import * as chokidar from "chokidar";
import path from "node:path";
import pDebounce from "p-debounce";
import tmp from "tmp-promise";
import type { BuildConfig } from "./build-config";
import { PackBuilder } from "./pack-builder";

/**
 * A context that remains constant for each BuildSystem instance.
 */
export type BuildSystemContext = {
	config: BuildConfig;
	id: string;
	tempDir: tmp.DirectoryResult;
	logger: Logger;
};

/**
 * A context that's created for every build execution (including rebuild).
 */
export type BuildExecutionContext = {
	parentCtx: BuildSystemContext;
	limitCheckPaths?: Set<string>;
	signal?: AbortSignal;
};

export class BuildSystem implements AsyncDisposable {
	private _bpBuilder?: PackBuilder;
	private _rpBuilder?: PackBuilder;
	private _currentController?: AbortController;
	private _isClosed = false;
	private _closeResolve?: () => void;

	constructor(readonly ctx: BuildSystemContext) {
		const { config } = ctx;

		if (config.bpConfig) {
			this._bpBuilder = new PackBuilder(
				config.bpConfig,
				"bp",
				createLogger({
					prefix: "BEH",
					minLevel: ctx.logger.minLevel,
				}),
			);
		}
		if (config.rpConfig) {
			this._rpBuilder = new PackBuilder(
				config.rpConfig,
				"rp",
				createLogger({
					prefix: "RES",
					minLevel: ctx.logger.minLevel,
				}),
			);
		}
	}

	get isClosed(): boolean {
		return this._isClosed;
	}

	[Symbol.asyncDispose](): PromiseLike<void> {
		return this.close();
	}

	async close(): Promise<void> {
		if (this._isClosed) return;

		this._isClosed = true;
		this._currentController?.abort();

		if (this._closeResolve) {
			this._closeResolve();
			this._closeResolve = undefined;
		}

		await this.ctx.tempDir.cleanup();
	}

	async runAndClose(): Promise<void> {
		if (this._isClosed) throw new Error("Build system is closed.");

		this.ctx.logger.info(`Starting initial build...`);

		try {
			await this.build();
		} catch (error) {
			this.ctx.logger.error(`Build failed. Closing build system...`);

			try {
				await this.close();
			} catch (closeError) {
				this.ctx.logger.error(`Failed to close build system after build failure: ${closeError}`);
			}

			throw error;
		}

		const shouldWatch = this.ctx.config.watch;

		if (!shouldWatch) {
			await this.close();
			return;
		}

		await this.watch();
	}

	private async build(limitCheckPaths?: Set<string>): Promise<{ isAborted?: boolean }> {
		this._currentController = new AbortController();
		const { signal } = this._currentController;

		const execCtx: BuildExecutionContext = {
			parentCtx: this.ctx,
			limitCheckPaths,
			signal,
		};

		try {
			const startTime = performance.now();

			const bpPromise = this._bpBuilder ? this._bpBuilder?.build(execCtx) : null;
			const rpPromise = this._rpBuilder ? this._rpBuilder?.build(execCtx) : null;

			const [bpResult, rpResult] = await Promise.allSettled([bpPromise, rpPromise]);

			const endTime = performance.now();
			const totalTimeStr = `${(endTime - startTime).toFixed(2)}ms`;

			const isAborted =
				(bpResult.status === "rejected" && bpResult.reason.name === "AbortError") ||
				(rpResult.status === "rejected" && rpResult.reason.name === "AbortError");

			if (isAborted) {
				this.ctx.logger.warn(`One or more pack builders have been aborted.`);
			} else {
				this.ctx.logger.success(`All tasks completed in ${totalTimeStr}.`);
			}

			return {
				isAborted,
			};
		} finally {
			this._currentController = undefined;
		}
	}

	private async rebuild(limitCheckPaths: Set<string>): Promise<void> {
		if (this._currentController) {
			this.ctx.logger.warn("Aborting current build execution...");
			this._currentController.abort();

			// Wait for this._currentController to be undefined
			await new Promise<void>((resolve) => {
				const timeout = setInterval(() => {
					if (this._currentController) return; // Still not finished
					clearInterval(timeout);
					resolve();
				}, 10);
			});
		}

		this.ctx.logger.info("Rebuilding...");

		const result = await this.build(limitCheckPaths);

		if (!result.isAborted) {
			limitCheckPaths.clear(); // Reset path check limits if build was not aborted
			this.ctx.logger.info("Watching for file changes...");
		}
	}

	private watch(): Promise<void> {
		const pathsToWatch: string[] = [];
		if (this._bpBuilder) pathsToWatch.push(this._bpBuilder.config.srcDir);
		if (this._rpBuilder) pathsToWatch.push(this._rpBuilder.config.srcDir);

		const watcher = chokidar.watch(pathsToWatch, {
			persistent: true,
			awaitWriteFinish: {
				stabilityThreshold: 300,
				pollInterval: 100,
			},
			atomic: 100,
			ignoreInitial: true,
			ignored: (file) => {
				if (this._bpBuilder && this._bpBuilder.isFilePartOfSrc(file))
					return !this._bpBuilder.shouldInclude(file);
				if (this._rpBuilder && this._rpBuilder.isFilePartOfSrc(file))
					return !this._rpBuilder.shouldInclude(file);
				return true;
			},
		});

		const changedFiles = new Set<string>();

		const debounceController = new AbortController();

		const rebuildDebounced = pDebounce(
			() => {
				this.rebuild(changedFiles);
			},
			100,
			{
				signal: debounceController.signal,
			},
		);

		const onFileChange = (filePath: string): void => {
			changedFiles.add(path.resolve(filePath));
			rebuildDebounced();
		};

		watcher.on("ready", () => this.ctx.logger.info("Watching for file changes..."));
		watcher.on("error", (error) => this.ctx.logger.error(`Watcher error: ${error}`));
		watcher.on("add", onFileChange);
		watcher.on("change", onFileChange);
		watcher.on("unlink", onFileChange);

		return new Promise<void>((resolve) => {
			// Never resolve until the BuildSystem instance is closed
			this._closeResolve = async () => {
				try {
					this.ctx.logger.info("Closing watcher...");
					await watcher.close();
					debounceController.abort();
				} finally {
					resolve();
				}
			};
		});
	}

	static async createContext(config: BuildConfig): Promise<BuildSystemContext> {
		if (!config.customTempDirRoot) {
			tmp.setGracefulCleanup();
		}

		const id = crypto.randomUUID();
		const tempDir = await tmp.dir({
			name: `builder-temp-${id}`,
			tmpdir: config.customTempDirRoot,
			unsafeCleanup: true,
		});

		const ctx: BuildSystemContext = {
			config,
			id,
			tempDir,
			logger: createLogger({
				prefix: "RUN",
				minLevel: config.logLevel,
			}),
		};

		return ctx;
	}
}
