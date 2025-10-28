export const isFileUrl = (urlString: string): boolean => {
	try {
		const url = new URL(urlString);
		return url.protocol === "file:";
	} catch (e) {
		return false; // Not a valid URL at all, so not a file URL
	}
};
