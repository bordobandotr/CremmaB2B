document.addEventListener('DOMContentLoaded', async function() {
    // Add early dark mode initialization to prevent flash of light mode
    const darkModeStyle = document.createElement('style');
    darkModeStyle.textContent = `
        .dark-mode-init {
            background-color: #121212;
            color: #E0E0E0;
        }
    `;
    document.head.appendChild(darkModeStyle);

    // Check dark mode preference and apply before page content loads
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    const headContent = await fetch('./components/header.html')
        .then(response => response.text());
    
    // Insert the header content after the existing head elements
    const head = document.head;
    const existingMeta = head.querySelector('meta[charset]');
    
    if (existingMeta) {
        existingMeta.insertAdjacentHTML('afterend', headContent);
    } else {
        head.insertAdjacentHTML('afterbegin', headContent);
    }

    const logoContent = await fetch('./components/logo_container.html')
        .then(response => response.text());
    
    // Insert the header content after the existing head elements
    const logo = document.getElementById('logo-container');
    if (logo) {
        logo.insertAdjacentHTML('afterbegin', logoContent);
    }
    
    // Load dark mode script
    loadJS('js/dark-mode.js');
});

// Add versioning function to prevent cache issues
function getVersionedUrl(url) {
    // Add a version parameter based on current timestamp
    // This ensures browsers will load fresh versions when files change
    return url + (url.includes('?') ? '&' : '?') + 'v=' + (new Date().getTime());
}

// Function to dynamically load CSS with versioning
function loadCSS(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = getVersionedUrl(href);
    document.head.appendChild(link);
}

// Function to dynamically load JS with versioning
function loadJS(src, async = false, defer = false) {
    const script = document.createElement('script');
    script.src = getVersionedUrl(src);
    script.async = async;
    script.defer = defer;
    document.body.appendChild(script);
}
