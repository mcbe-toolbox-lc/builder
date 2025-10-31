import { createLogger, type Logger } from "@/utils/logger";
import * as chokidar from "chokidar";
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

		try {
			await this.build();
		} catch (error) {
			try {
				await this.close();
			} catch (closeError) {
				this.ctx.logger.error(`Failed to close BuildSystem after build failure: ${closeError}`);
			}

			throw error;
		}

		const shouldWatch = false; // TODO

		if (!shouldWatch) {
			await this.close();
			return;
		}

		await this.watch();
	}

	private async build(): Promise<void> {
		this._currentController = new AbortController();
		const { signal } = this._currentController;

		const execCtx: BuildExecutionContext = {
			parentCtx: this.ctx,
			signal,
		};

		try {
			const bpPromise = this._bpBuilder ? this._bpBuilder?.build(execCtx) : null;
			const rpPromise = this._rpBuilder ? this._rpBuilder?.build(execCtx) : null;

			const [bpResult, rpResult] = await Promise.allSettled([bpPromise, rpPromise]);
		} finally {
			this._currentController = undefined;
		}
	}

	private async rebuild(): Promise<void> {
		if (this._currentController) {
			this.ctx.logger.warn("Aborting current build execution...");
			this._currentController.abort();

			// Wait for this._currentController to be undefined
			await new Promise<void>((resolve) => {
				const timeout = setInterval(() => {
					if (this._currentController) return; // Still not finished
					clearInterval(timeout);
					resolve();
				}, 69);
			});
		}

		await this.build();
	}

	private watch(): Promise<void> {
		// TODO: Watch for file changes and rebuild

		return new Promise<void>((resolve) => {
			this._closeResolve = resolve; // Never resolve until the BuildSystem instance is closed
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
