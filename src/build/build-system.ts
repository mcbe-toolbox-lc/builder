import { createLogger, type Logger } from "@/utils/logger";
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

		const shouldWatch = false; // TODO

		if (!shouldWatch) {
			await this.close();
			return;
		}
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
