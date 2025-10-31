import { resolveAndValidateUserConfig } from "@/build/build-config";
import { BuildSystem } from "@/build/build-system";
import fs from "fs-extra";
import path from "node:path";
import tmp from "tmp-promise";
import { describe, expect, it } from "vitest";

describe("BuildSystem", () => {
	it("handles temporal directory cleanup", async () => {
		const config = resolveAndValidateUserConfig({
			behaviorPack: {
				srcDir: "src/bp",
				targetDir: "dist/bp",
			},
			logLevel: "silent",
		});

		const ctx = await BuildSystem.createContext(config);

		// Temporal directory should exist
		expect(() => fs.statSync(ctx.tempDir.path)).not.toThrow();

		// BuildSystem is AsyncDisposable so it should do the cleanup when it goes out of scope
		{
			await using buildSystem = new BuildSystem(ctx);

			// Simulate I/O operation during build
			await fs.outputFile(
				path.join(buildSystem.ctx.tempDir.path, "a sub dir", "a file"),
				"a content",
				"utf8",
			);
		}

		// Temporal directory should be gone now
		expect(() => fs.statSync(ctx.tempDir.path)).toThrow();
	});

	it("copies files correctly", async () => {
		const tmpDir = await tmp.dir({
			unsafeCleanup: true,
		});

		try {
			const bpSrcDir = path.join(tmpDir.path, "src/bp");
			const bpTargetDir = path.join(tmpDir.path, "dist/bp");

			await fs.outputFile(path.join(bpSrcDir, "test file"), "some text");

			const config = resolveAndValidateUserConfig({
				behaviorPack: {
					srcDir: bpSrcDir,
					targetDir: bpTargetDir,
				},
				logLevel: "silent",
			});

			const ctx = await BuildSystem.createContext(config);

			const buildSystem = new BuildSystem(ctx);

			await buildSystem.run();

			expect(buildSystem.isClosed).toBe(true);
			expect(await fs.readFile(path.join(bpTargetDir, "test file"), "utf8")).toBe("some text");
		} finally {
			tmpDir.cleanup();
		}
	});
});
