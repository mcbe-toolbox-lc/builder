import type { LogLevel } from "@/types/misc";
import { styleText } from "node:util";

type Color = Parameters<typeof styleText>[0];

export type LoggerConfig = {
	prefix: string;
	minLevel?: LogLevel;
};

export type LogOptions = {
	prefixColorOverride?: Color;
	messageColorOverride?: Color;
};

export type Logger = {
	readonly minLevel: LogLevel;
	readonly debug: (message: string, options?: LogOptions) => void;
	readonly info: (message: string, options?: LogOptions) => void;
	readonly success: (message: string, options?: LogOptions) => void;
	readonly warn: (message: string, options?: LogOptions) => void;
	readonly error: (message: string, options?: LogOptions) => void;
};

type LogLevelInfo = {
	value: number;
	prefixColor: Color;
	messageColor: Color;
	method: "log" | "warn" | "error";
};

const LOG_LEVEL_CONFIG: Record<LogLevel, LogLevelInfo> = {
	debug: { value: 0, prefixColor: "dim", messageColor: "dim", method: "log" },
	info: { value: 1, prefixColor: "blue", messageColor: "white", method: "log" },
	warn: { value: 2, prefixColor: "yellow", messageColor: "yellow", method: "warn" },
	error: { value: 3, prefixColor: "red", messageColor: "red", method: "error" },
	silent: { value: 4, prefixColor: "dim", messageColor: "dim", method: "log" },
};

export const createLogger = (config: LoggerConfig): Logger => {
	const { prefix } = config;
	const minLevel = config.minLevel ?? "info";
	const minLevelValue = LOG_LEVEL_CONFIG[minLevel].value;

	const log = (level: Exclude<LogLevel, "silent">, message: string, options?: LogOptions) => {
		const levelInfo = LOG_LEVEL_CONFIG[level];

		if (levelInfo.value < minLevelValue) return;

		const prefixColor = options?.prefixColorOverride ?? levelInfo.prefixColor;
		const messageColor = options?.messageColorOverride ?? levelInfo.messageColor;

		const prefixStr = styleText(prefixColor, `${prefix.toUpperCase()}`);
		const messageStr = styleText(messageColor, message);

		const finalMessage = [prefixStr, messageStr].filter(Boolean).join(" ");

		console[levelInfo.method](finalMessage);
	};

	return {
		minLevel,
		debug: (message, options) => log("debug", message, options),
		info: (message, options) => log("info", message, options),
		warn: (message, options) => log("warn", message, options),
		error: (message, options) => log("error", message, options),
		success: (message, options) => {
			log("info", message, {
				prefixColorOverride: "green",
				...options,
			});
		},
	};
};
