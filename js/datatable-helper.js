/**
 * DataTable Helper utilities for working with sidebar toggle
 */

/**
 * Adds a refresh button to the page that will reload with the refreshOnToggle parameter
 * This is a fallback solution for pages where DataTables don't resize properly with the sidebar toggle
 */
function addDataTableRefreshButton() {
    // Check if the button already exists
    if (document.getElementById('datatableRefreshToggle')) {
        return;
    }
    
    // Create the refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'datatableRefreshToggle';
    refreshBtn.className = 'btn btn-sm btn-outline-secondary';
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Tabloyu Yenile';
    refreshBtn.title = 'Tablo genişliğini düzeltmek için sayfayı yeniler';
    refreshBtn.style.position = 'fixed';
    refreshBtn.style.left = '290px';
    refreshBtn.style.bottom = '20px';
    refreshBtn.style.zIndex = '1000';
    refreshBtn.style.opacity = '0.8';
    
    // Add click event to refresh the page with the refreshOnToggle parameter
    refreshBtn.addEventListener('click', function() {
        const url = new URL(window.location.href);
        url.searchParams.set('refreshOnToggle', 'true');
        window.location.href = url.toString();
    });
    
    // Append to body
    document.body.appendChild(refreshBtn);
}

/**
 * Force redraw all DataTables on the page
 */
function forceRedrawDataTables() {
    if (window.$ && $.fn.DataTable) {
        try {
            // Try different methods to redraw tables
            $.fn.dataTable.tables({ visible: true, api: true }).responsive.recalc();
            $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust().draw();
            
            // Alternative approach for specific tables
            const commonTableIds = ['ordersTable', 'deliveryItems', 'stockTable', 'itemsTable'];
            commonTableIds.forEach(tableId => {
                const table = $('#' + tableId);
                if (table.length && $.fn.DataTable.isDataTable(table)) {
                    table.DataTable().columns.adjust().responsive.recalc().draw();
                }
            });
        } catch (e) {
            console.warn('Error forcing DataTable redraw:', e);
        }
    }
}

// Check if we need to show the fallback button
document.addEventListener('DOMContentLoaded', function() {
    // Only add the refresh button if the page has DataTables
    if (window.$ && $.fn.DataTable && $.fn.DataTable.tables) {
        setTimeout(() => {
            const hasTables = $.fn.dataTable.tables().length > 0;
            if (hasTables) {
                addDataTableRefreshButton();
            }
        }, 1000); // Wait for tables to initialize
    }
}); 