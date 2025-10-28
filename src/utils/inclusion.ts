import { minimatch } from "minimatch";
import { relative, resolve } from "node:path";

export const testInclusion = (
	path: string,
	baseDir: string,
	include?: string[],
	exclude?: string[],
): boolean => {
	const fullPath = resolve(path);

	baseDir = resolve(baseDir);

	if (!fullPath.startsWith(baseDir)) return false;

	const relativePath = relative(baseDir, fullPath).replaceAll("\\", "/");

	const isExcluded =
		exclude !== undefined && exclude.some((pattern) => minimatch(relativePath, pattern));
	if (isExcluded) return false;

	const isIncluded =
		include === undefined || include.some((pattern) => minimatch(relativePath, pattern));
	return isIncluded;
};
