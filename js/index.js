// Load components
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
    }
}

// Update page title and header
function updatePageInfo(pageName) {
    const titles = {
        'dashboard': 'Anasayfa',
        'production-orders': 'Üretim Siparişleri',
        'external-supply': 'Dış Tedarik',
        'transfers': 'Transferler',
        'main-depot': 'Ana Depo',
        'checklist': 'Check List',
        'fire-waste': 'Fire Ve Zayi',
        'ticket': 'Ticket',
        'stock-count': 'Stok Sayımı'
    };

    document.title = `CREMMA - ${titles[pageName] || 'Anasayfa'}`;
    const headerTitle = document.querySelector('#header span');
    if (headerTitle) {
        headerTitle.textContent = titles[pageName] || 'Anasayfa';
    }
}

// Load page content
async function loadPage(pageName) {
    try {
        const response = await fetch(`pages/${pageName}.html`);
        const html = await response.text();
        document.getElementById('main-content').innerHTML = html;
        
        // Update page title and header
        updatePageInfo(pageName);
        
        // Update active state in sidebar
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            }
        });

        // Initialize page-specific features
        switch(pageName) {
            case 'production-orders':
                if ($.fn.DataTable.isDataTable('#productionOrdersTable')) {
                    $('#productionOrdersTable').DataTable().destroy();
                }
                $('#productionOrdersTable').DataTable({
                    language: {
                        url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
                    }
                });
                break;
            case 'dashboard':
                // Chart.js initialization will be handled by the dashboard page script
                break;
        }
    } catch (error) {
        console.error(`Error loading page ${pageName}:`, error);
    }
}

// Initialize components
async function initializeApp() {
    // Load components
    await loadComponent('header', 'components/header.html');
    await loadComponent('sidebar', 'components/sidebar.html');
    
    // Load default page (dashboard)
    const currentPage = window.location.hash.slice(1) || 'dashboard';
    await loadPage(currentPage);
    
    // Add event listeners for navigation
    document.addEventListener('click', function(e) {
        const link = e.target.closest('.nav-link');
        if (link && link.hasAttribute('data-page')) {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            window.location.hash = page;
            loadPage(page);
        }
    });

    // Handle browser back/forward
    window.addEventListener('hashchange', function() {
        const page = window.location.hash.slice(1) || 'dashboard';
        loadPage(page);
    });
    
    // Logout handler
    document.getElementById('logout').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'login.html';
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);
