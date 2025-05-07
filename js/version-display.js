/**
 * version-display.js
 * 
 * This script loads the application version from package.json
 * and displays it in the sidebar user section.
 */

// Fetch the package.json to get the version
async function loadAppVersion() {
    try {
        // Fetch the package.json file from the server
        const response = await fetch('/package.json');
        const packageData = await response.json();
        
        // Get the version from package.json
        const version = packageData.version;
        
        // Insert version into the version display element
        const versionDisplay = document.getElementById('app-version');
        if (versionDisplay) {
            versionDisplay.textContent = `v${version}`;
        }
        
        // Also save to local storage for pages that might need it
        localStorage.setItem('appVersion', version);
        
        return version;
    } catch (error) {
        console.warn('Failed to load version from package.json:', error);
        
        // Fallback: Check if version was stored in localStorage
        const storedVersion = localStorage.getItem('appVersion');
        if (storedVersion) {
            const versionDisplay = document.getElementById('app-version');
            if (versionDisplay) {
                versionDisplay.textContent = `v${storedVersion}`;
            }
            return storedVersion;
        }
        
        return '1.0.0'; // Default fallback version
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', loadAppVersion);

// Export the function for direct use
window.loadAppVersion = loadAppVersion; 