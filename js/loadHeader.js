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
    
    document.head.insertAdjacentHTML('beforeend', headContent);
    
    // Load sidebar components
    const navMenu = document.getElementById('sidebar-nav');
    if (navMenu) {
        const navMenuContent = await fetch('./components/nav-menu.html')
            .then(response => response.text());
        navMenu.insertAdjacentHTML('afterbegin', navMenuContent);
    }
    
    const sidebarUser = document.getElementById('sidebar-user');
    if (sidebarUser) {
        const sidebarUserContent = await fetch('./components/sidebar_user.html')
            .then(response => response.text());
        sidebarUser.insertAdjacentHTML('afterbegin', sidebarUserContent);
    }
    
    const logo = document.getElementById('logo-container');
    if (logo) {
        const logoContent = await fetch('./components/logo_container.html')
            .then(response => response.text());
        logo.insertAdjacentHTML('afterbegin', logoContent);
    }
    
    // Load dark mode script
    loadJS('js/dark-mode.js');
    
    // Load version display script
    loadJS('js/version-display.js');
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
