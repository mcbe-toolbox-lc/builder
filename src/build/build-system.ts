import type { BuildConfig } from "./build-config";
import { PackBuilder } from "./pack-builder";
import tmp from "tmp-promise";

/**
 * A context that remains constant for each BuildSystem instance.
 */
export type BuildSystemContext = {
	config: BuildConfig;
	id: string;
	tempDir: tmp.DirectoryResult;
};

/**
 * A context is that is created for every build execution (including rebuild).
 */
export type BuildExecutionContext = {
	buildSystemCtx: BuildSystemContext;
	signal?: AbortSignal;
};

export class BuildSystem implements AsyncDisposable {
	private _bpBuilder?: PackBuilder;
	private _rpBuilder?: PackBuilder;
	private _currentController?: AbortController;
	private _isClosed = false;

	constructor(readonly ctx: BuildSystemContext) {
		const { config } = ctx;

		if (config.bpConfig) {
			this._bpBuilder = new PackBuilder(config.bpConfig);
		}
		if (config.rpConfig) {
			this._rpBuilder = new PackBuilder(config.rpConfig);
		}
	}

	static async createContext(config: BuildConfig): Promise<BuildSystemContext> {
		if (!config.customTempDirRoot) {
			tmp.setGracefulCleanup();
		}

		const id = crypto.randomUUID();
		const tempDir = await tmp.dir({
			name: `builder-${id}`,
			tmpdir: config.customTempDirRoot,
		});

		const ctx: BuildSystemContext = {
			config,
			id,
			tempDir,
		};

		return ctx;
	}

	private async build(): Promise<void> {
		this._currentController = new AbortController();
		const { signal } = this._currentController;

		const execCtx: BuildExecutionContext = {
			buildSystemCtx: this.ctx,
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

	start(): Promise<void> {
		if (this._isClosed) throw new Error("Build system is closed.");

		return this.build();
	}

	async close(): Promise<void> {
		this._isClosed = true;
		this._currentController?.abort();
		await this.ctx.tempDir.cleanup();
	}

	[Symbol.asyncDispose](): PromiseLike<void> {
		return this.close();
	}

	get isClosed(): boolean {
		return this._isClosed;
	}
}
