document.addEventListener('DOMContentLoaded', function() {
    // Create and append the toggle button to the body
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'sidebarToggleBtn';
    toggleBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
    toggleBtn.title = 'Sidebar Daralt/Genişlet';
    document.body.appendChild(toggleBtn);

    // Get DOM elements
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    // Check localStorage for saved state
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    // Check if page should be refreshed on toggle (from URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const refreshOnToggle = urlParams.get('refreshOnToggle') === 'true';
    
    // Initialize state based on localStorage
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('sidebar-collapsed');
        toggleBtn.classList.add('collapsed');
        toggleBtn.querySelector('i').classList.remove('bi-chevron-left');
        toggleBtn.querySelector('i').classList.add('bi-chevron-right');
    }
    
    // Function to redraw DataTables to adjust to new width
    function redrawDataTables() {
        // Give a small delay for the transition to complete
        setTimeout(() => {
            // Check if DataTables is available and has tables
            if (window.$ && $.fn.DataTable) {
                try {
                    // Find all DataTables instances and redraw them
                    $.fn.dataTable.tables({ visible: true, api: true }).responsive.recalc();
                    $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust().draw();
                    
                    // Alternative approach for specific table IDs
                    const commonTableIds = ['ordersTable', 'deliveryItems', 'stockTable', 'itemsTable'];
                    commonTableIds.forEach(tableId => {
                        const table = $('#' + tableId);
                        if (table.length && $.fn.DataTable.isDataTable(table)) {
                            table.DataTable().columns.adjust().responsive.recalc().draw();
                        }
                    });
                } catch (e) {
                    console.warn('Error adjusting DataTables:', e);
                }
            }
        }, 300); // 300ms timeout matches CSS transition time
    }
    
    // Function to refresh the page if needed
    function handleRefreshIfNeeded() {
        if (refreshOnToggle) {
            // Preserve all current URL parameters
            window.location.reload();
        }
    }
    
    // Toggle sidebar on button click
    toggleBtn.addEventListener('click', function() {
        // Toggle classes
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('sidebar-collapsed');
        toggleBtn.classList.toggle('collapsed');
        
        // Toggle icon
        const icon = toggleBtn.querySelector('i');
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.remove('bi-chevron-left');
            icon.classList.add('bi-chevron-right');
            // Save state to localStorage
            localStorage.setItem('sidebarCollapsed', 'true');
        } else {
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-left');
            // Save state to localStorage
            localStorage.setItem('sidebarCollapsed', 'false');
        }
        
        // Redraw DataTables
        redrawDataTables();
        
        // Refresh page if needed
        handleRefreshIfNeeded();
    });
    
    // Handle mobile sidebar toggle separately
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.body.classList.toggle('show-sidebar');
            if (document.body.classList.contains('show-sidebar')) {
                toggleBtn.classList.add('show-sidebar');
            } else {
                toggleBtn.classList.remove('show-sidebar');
            }
            
            // Redraw DataTables for mobile toggle too
            redrawDataTables();
        });
    }
    
    // Also redraw DataTables on page load if sidebar is in collapsed state
    if (sidebarCollapsed) {
        redrawDataTables();
    }
    
    // Add event listener for transition end to ensure tables are redrawn after transition completes
    mainContent.addEventListener('transitionend', function(e) {
        if (e.propertyName === 'width' || e.propertyName === 'margin-left') {
            redrawDataTables();
        }
    });
}); 