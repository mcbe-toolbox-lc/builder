import type { PackConfig } from "./build-config";
import type { BuildExecutionContext } from "./build-system";

export class PackBuilder {
	constructor(readonly config: PackConfig) {}

	async build(ctx: BuildExecutionContext): Promise<void> {}
}
