import type { BuildConfig } from "./build-config";
import { PackBuilder } from "./pack-builder";
import tmp from "tmp-promise";

export type BuildSystemContext = {
	config: BuildConfig;
	id: string;
	tempDir: tmp.DirectoryResult;
};

export type BuildExecutionContext = {
	buildSystemCtx: BuildSystemContext;
	signal?: AbortSignal;
};

export class BuildSystem {
	private _bpBuilder?: PackBuilder;
	private _rpBuilder?: PackBuilder;
	private _currentController?: AbortController;

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
		const id = crypto.randomUUID();
		const tempDir = await tmp.dir({
			name: `builder-${id}`,
			tmpdir: config.customTempDirRoot,
			unsafeCleanup: true,
			keep: true,
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
		return this.build();
	}
}
