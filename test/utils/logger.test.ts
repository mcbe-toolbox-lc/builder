import { createLogger, type Logger } from "@/utils/logger";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

// Mock the 'node:util' module to simplify testing styled text.
// Instead of outputting ANSI codes, it will output a predictable string.
vi.mock("node:util", () => ({
	styleText: (color: string, text: string) => `[${color}]:${text}`,
}));

describe("createLogger()", () => {
	let consoleLogSpy: MockInstance;
	let consoleWarnSpy: MockInstance;
	let consoleErrorSpy: MockInstance;

	// Set up spies on console methods before each test
	beforeEach(() => {
		// Mock implementations to prevent actual console output during tests
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	// Restore original console methods after each test
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Logging Levels (default minLevel: "info")', () => {
		let logger: Logger;

		beforeEach(() => {
			logger = createLogger({ prefix: "Test" });
		});

		it("should log info messages", () => {
			logger.info("Hello");
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			// Format: [PREFIX_COLOR]:[PREFIX] [LEVEL_COLOR]:[LEVEL] [MESSAGE_COLOR]:Message
			expect(consoleLogSpy).toHaveBeenCalledWith("[blue]:[TEST] [blue]:[INFO] [white]:Hello");
		});

		it("should log success messages with green prefix", () => {
			logger.success("It worked");
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			expect(consoleLogSpy).toHaveBeenCalledWith("[green]:[TEST] [blue]:[INFO] [white]:It worked");
		});

		it("should log warn messages", () => {
			logger.warn("Warning");
			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"[yellow]:[TEST] [yellow]:[WARN] [yellow]:Warning",
			);
		});

		it("should log error messages", () => {
			logger.error("Oops");
			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith("[red]:[TEST] [red]:[ERROR] [red]:Oops");
		});

		it("should NOT log debug messages by default", () => {
			logger.debug("Details");
			expect(consoleLogSpy).not.toHaveBeenCalled();
		});
	});

	describe("minLevel Configuration", () => {
		it('should log debug when minLevel is "debug"', () => {
			const logger = createLogger({ prefix: "Debug", minLevel: "debug" });
			logger.debug("Debug info");
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			expect(consoleLogSpy).toHaveBeenCalledWith("[dim]:[DEBUG] [dim]:[DEBUG] [dim]:Debug info");
		});

		it('should not log info or debug when minLevel is "warn"', () => {
			const logger = createLogger({ prefix: "Warn", minLevel: "warn" });
			logger.debug("Should not appear");
			logger.info("Should not appear");
			logger.warn("Should appear");

			expect(consoleLogSpy).not.toHaveBeenCalled();
			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).not.toHaveBeenCalled();
		});

		it('should log nothing when minLevel is "silent"', () => {
			const logger = createLogger({ prefix: "Silent", minLevel: "silent" });
			logger.debug("a");
			logger.info("b");
			logger.success("c");
			logger.warn("d");
			logger.error("e");

			expect(consoleLogSpy).not.toHaveBeenCalled();
			expect(consoleWarnSpy).not.toHaveBeenCalled();
			expect(consoleErrorSpy).not.toHaveBeenCalled();
		});
	});

	describe("LogOptions Overrides", () => {
		let logger: Logger;

		beforeEach(() => {
			// Set minLevel to 'debug' to ensure all levels can be tested
			logger = createLogger({ prefix: "Override", minLevel: "debug" });
		});

		it("should apply prefixColorOverride", () => {
			logger.info("Test", { prefixColorOverride: "cyan" });
			expect(consoleLogSpy).toHaveBeenCalledWith("[cyan]:[OVERRIDE] [blue]:[INFO] [white]:Test");
		});

		it("should apply messageColorOverride", () => {
			logger.warn("Test", { messageColorOverride: "magenta" });
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"[yellow]:[OVERRIDE] [yellow]:[WARN] [magenta]:Test",
			);
		});

		it("should apply both overrides", () => {
			logger.error("Test", { prefixColorOverride: "green", messageColorOverride: "blue" });
			expect(consoleErrorSpy).toHaveBeenCalledWith("[green]:[OVERRIDE] [red]:[ERROR] [blue]:Test");
		});

		it("should allow success message options to override success defaults", () => {
			// `success` defaults to prefixColorOverride: 'green'
			// We provide 'magenta' to override that default.
			logger.success("Test", { prefixColorOverride: "magenta", messageColorOverride: "yellow" });
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[magenta]:[OVERRIDE] [blue]:[INFO] [yellow]:Test",
			);
		});
	});
});
