/**
 * superfreq - App Configuration
 * Defines global configuration such as CDN base URL.
 */

// Create a global configuration object if it doesn't exist
window.APP_CONFIG = window.APP_CONFIG || {};

// CDN base URL for static assets (e.g., audio files). Leave empty for relative paths.
// This can be overridden before this script runs by defining window.APP_CONFIG.CDN_BASE_URL.
window.APP_CONFIG.CDN_BASE_URL = window.APP_CONFIG.CDN_BASE_URL || '';

// Optional: Explicit URL to a samples manifest JSON. If not provided, defaults to
// `${CDN_BASE_URL}/audio/samples/manifest.json` or `audio/samples/manifest.json` when CDN_BASE_URL is empty.
window.APP_CONFIG.SAMPLES_MANIFEST_URL = window.APP_CONFIG.SAMPLES_MANIFEST_URL || (
	window.APP_CONFIG.CDN_BASE_URL
		? window.APP_CONFIG.CDN_BASE_URL.replace(/\/$/, '') + '/audio/samples/manifest.json'
		: 'audio/samples/manifest.json'
);

// Optional: Explicit base folder URL for samples. Used to resolve relative entries in the manifest.
// Defaults to `${CDN_BASE_URL}/audio/samples/` or `audio/samples/`.
window.APP_CONFIG.SAMPLES_FOLDER_URL = window.APP_CONFIG.SAMPLES_FOLDER_URL || (
	window.APP_CONFIG.CDN_BASE_URL
		? window.APP_CONFIG.CDN_BASE_URL.replace(/\/$/, '') + '/audio/samples/'
		: 'audio/samples/'
);

