/**
 * version-assets.js
 * This script adds versioning to all CSS and JavaScript references in HTML pages
 * to prevent caching issues.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add version parameter to all CSS links
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href && !link.href.includes('?v=')) {
            link.href = addVersionParameter(link.href);
        }
    });

    // Add version parameter to all script tags
    document.querySelectorAll('script[src]').forEach(script => {
        if (script.src && !script.src.includes('?v=')) {
            script.src = addVersionParameter(script.src);
        }
    });

    // Add version parameter to all image sources
    document.querySelectorAll('img[src]').forEach(img => {
        if (img.src && !img.src.includes('?v=')) {
            img.src = addVersionParameter(img.src);
        }
    });
});

/**
 * Adds a version parameter to a URL
 * @param {string} url - The URL to add the version to
 * @returns {string} - The URL with version parameter
 */
function addVersionParameter(url) {
    // Use a timestamp as version parameter
    const version = new Date().getTime();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
} 