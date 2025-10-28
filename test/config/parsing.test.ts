import { parseConfig } from "@/config/parsing";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("parseConfig()", () => {
	it("throws if no packs are defined", () => {
		expect(() => parseConfig({})).toThrowError();
	});

	it("resolves targetDir correctly", () => {
		const inputBpTargetDir = "bp_target";
		const inputRpTargetDir1 = "rp_target_1";
		const inputRpTargetDir2 = "rp_target_2";
		const expectedBpTargetDir = path.resolve(inputBpTargetDir);
		const expectedRpTargetDir1 = path.resolve(inputRpTargetDir1);
		const expectedRpTargetDir2 = path.resolve(inputRpTargetDir2);

		const config = parseConfig({
			behaviorPack: {
				srcDir: "",
				targetDir: inputBpTargetDir,
			},
			resourcePack: {
				srcDir: "",
				targetDir: [inputRpTargetDir1, inputRpTargetDir2],
			},
		});

		expect(config.behaviorPack?.targetDirs).toStrictEqual([expectedBpTargetDir]);
		expect(config.resourcePack?.targetDirs).toStrictEqual([
			expectedRpTargetDir1,
			expectedRpTargetDir2,
		]);
	});
});
