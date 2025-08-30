/**
 * superfreq - App Configuration
 * Defines global configuration such as CDN base URL.
 */

// Create a global configuration object if it doesn't exist
window.APP_CONFIG = window.APP_CONFIG || {};

// CDN base URL for static assets (e.g., audio files). Leave empty for relative paths.
// This can be overridden before this script runs by defining window.APP_CONFIG.CDN_BASE_URL.
window.APP_CONFIG.CDN_BASE_URL = window.APP_CONFIG.CDN_BASE_URL || '';

