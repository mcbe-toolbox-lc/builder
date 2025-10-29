import { resolveAndValidateUserConfig } from "@/build/build-config";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("resolveAndValidateUserConfig()", () => {
	it("throws if no packs are defined", () => {
		expect(() => resolveAndValidateUserConfig({})).toThrowError();
	});

	it("resolves targetDir correctly", () => {
		const inputBpTargetDir = "bp_target";
		const inputRpTargetDir1 = "rp_target_1";
		const inputRpTargetDir2 = "rp_target_2";
		const expectedBpTargetDirs = [path.resolve(inputBpTargetDir)];
		const expectedRpTargetDirs = [path.resolve(inputRpTargetDir1), path.resolve(inputRpTargetDir2)];

		const config = resolveAndValidateUserConfig({
			behaviorPack: {
				srcDir: "",
				targetDir: inputBpTargetDir,
			},
			resourcePack: {
				srcDir: "",
				targetDir: [inputRpTargetDir1, inputRpTargetDir2],
			},
		});

		expect(config.bpConfig?.targetDirs).toStrictEqual(expectedBpTargetDirs);
		expect(config.rpConfig?.targetDirs).toStrictEqual(expectedRpTargetDirs);
	});
});
