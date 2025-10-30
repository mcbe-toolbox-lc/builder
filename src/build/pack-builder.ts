import type { Logger } from "@/utils/logger";
import type { PackConfig } from "./build-config";
import type { BuildExecutionContext } from "./build-system";

export class PackBuilder {
	constructor(
		readonly config: PackConfig,
		private readonly logger: Logger,
	) {}

	async build(ctx: BuildExecutionContext): Promise<void> {}
}
