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
 * A context is that is created for every build execution (including rebuild).
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
				"BP",
				createLogger({
					prefix: "BP",
					minLevel: ctx.logger.minLevel,
				}),
			);
		}
		if (config.rpConfig) {
			this._rpBuilder = new PackBuilder(
				config.rpConfig,
				"RP",
				createLogger({
					prefix: "RP",
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

	async run(): Promise<void> {
		if (this._isClosed) throw new Error("Build system is closed.");

		try {
			await this.build();
		} catch (error) {
			try {
				await this.close();
			} catch (closeError) {
				console.error("Failed to close BuildSystem after build failure.", closeError);
			}

			throw error;
		}

		const shouldWatch = false; // TODO

		if (!shouldWatch) {
			await this.close();
			return;
		}
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
