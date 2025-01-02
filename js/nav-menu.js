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
        console.log('currentPage:', currentPage);
        console.log('currentPath:', currentPath);
        
        // Add active class to current page link
        const currentLink = sidebarNav.querySelector(`a[href="${currentPage}"]`);
        console.log('currentLink:', currentLink);
        if (currentLink) {
            currentLink.classList.add('active');
        }
        
    } catch (error) {
        console.error('Error loading navigation menu:', error);
    }
});
