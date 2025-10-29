import { isFileUrl } from "@/utils/url";
import { describe, expect, it } from "vitest";

describe("isFileUrl()", () => {
	it("returns correct value", () => {
		expect(isFileUrl("C:/Windows/")).toBe(false);
		expect(isFileUrl("file:///C:/Windows/")).toBe(true);
	});
});
