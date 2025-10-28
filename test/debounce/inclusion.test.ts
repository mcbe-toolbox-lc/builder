import { testInclusion } from "@/utils/inclusion";
import { describe, expect, it } from "vitest";

describe("testInclusion()", () => {
	it("matches correctly", () => {
		expect(testInclusion("src/main.js", "src")).toBe(true);
		expect(testInclusion("src/main.js", "root")).toBe(false);
		expect(testInclusion("src/entities/hi.json", "src", ["entities/**/*"])).toBe(true);
		expect(testInclusion("src/hi.json", "src", ["entities/**/*"])).toBe(false);
		expect(testInclusion("src/private/file.txt", "src", [], ["private/**/*"])).toBe(false);
	});
});
