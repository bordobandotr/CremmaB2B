document.addEventListener('DOMContentLoaded', async function() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav) return;

    try {
        // Load navigation menu template
        const response = await fetch('/components/nav-menu.html');
        const html = await response.text();
        
        // Insert the HTML
        sidebarNav.innerHTML = html;
        
        // Get current page URL
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop().split('?')[0];
        
        // Set active class based on current page
        const isUretimPage = currentPage.startsWith('uretim-siparis');
        if (isUretimPage) {
            const uretimLink = sidebarNav.querySelector('a[href="uretim-siparisleri.html"]');
            if (uretimLink) {
                uretimLink.classList.add('active');
            }
        }
    } catch (error) {
        console.error('Error loading navigation menu:', error);
    }
});
