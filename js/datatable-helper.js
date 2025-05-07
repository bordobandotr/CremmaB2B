/**
 * DataTable Helper utilities for working with sidebar toggle
 */

/**
 * Disables caching for all DataTables
 * This ensures table data is always freshly requested from the server
 */
function disableDataTableCaching() {
    // Check if DataTable plugin exists
    if (window.$ && $.fn.DataTable) {
        // Set global default
        $.extend($.fn.dataTable.defaults, {
            // Disable all client-side caching
            bStateSave: false,
            // Always reload data on page reload
            bDeferRender: false,
            // Force fresh AJAX requests
            ajax: {
                cache: false
            }
        });
        
        // Monkey patch the original $.fn.DataTable.ajax.reload function
        const originalReload = $.fn.DataTable.Api.prototype.ajax.reload;
        $.fn.DataTable.Api.prototype.ajax.reload = function(callback, resetPaging) {
            // Add cache-busting parameter to force fresh data
            this.ajax.url(this.ajax.url().split('?')[0] + '?_=' + new Date().getTime());
            // Call the original reload function with the provided callback and resetPaging option
            return originalReload.call(this, callback, resetPaging);
        };
        
        console.log('DataTable caching disabled successfully');
    }
}

/**
 * Patch all DataTable instances after they're created to disable caching
 */
function patchAllDataTablesForNoCache() {
    // Check if DataTable plugin exists
    if (window.$ && $.fn.DataTable) {
        // Store the original dataTable initialization function
        const originalDataTable = $.fn.dataTable;
        
        // Override the dataTable initialization function
        $.fn.dataTable = function(options) {
            // Default options to disable caching
            const noCacheOptions = {
                bStateSave: false,
                bDeferRender: false,
                ajax: {
                    cache: false
                }
            };
            
            // Merge with user options (user options take precedence)
            const mergedOptions = $.extend({}, noCacheOptions, options);
            
            // Call the original initialization function with merged options
            const instance = originalDataTable.apply(this, [mergedOptions]);
            
            // Add a data reload function that bypasses cache
            if (instance && instance.ajax && instance.ajax.url) {
                const originalUrl = instance.ajax.url();
                instance.reloadFreshData = function(callback) {
                    const cacheBuster = new Date().getTime();
                    const url = originalUrl.split('?')[0] + '?_=' + cacheBuster;
                    instance.ajax.url(url).load(callback, true);
                };
            }
            
            return instance;
        };
        
        // Copy all properties from the original dataTable object
        for (const prop in originalDataTable) {
            if (originalDataTable.hasOwnProperty(prop)) {
                $.fn.dataTable[prop] = originalDataTable[prop];
            }
        }
        
        console.log('All new DataTable instances patched for no-cache behavior');
    }
}

/**
 * Add this at the beginning of the file, after the first comment block
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
        forceRedrawDataTables();
    });
    
    // Append to body
    document.body.appendChild(refreshBtn);

    // Adjust button position based on sidebar state
    if (document.querySelector('.sidebar.collapsed')) {
        refreshBtn.style.left = '110px';
    }

    // Listen for sidebar toggle to reposition the button
    document.querySelector('.main-content').addEventListener('transitionend', function(e) {
        if (e.propertyName === 'margin-left' || e.propertyName === 'width') {
            if (document.querySelector('.sidebar.collapsed')) {
                refreshBtn.style.left = '110px';
            } else {
                refreshBtn.style.left = '290px';
            }
        }
    });
}

/**
 * Force redraw all DataTables on the page
 */
function forceRedrawDataTables() {
    if (window.$ && $.fn.DataTable) {
        try {
            // Give tables a moment to adjust to new size
            setTimeout(() => {
                // Try different methods to redraw tables
                try {
                    $.fn.dataTable.tables({ visible: true, api: true }).responsive.recalc();
                } catch (e) {
                    console.warn('Error recalculating responsive tables:', e);
                }
                
                try {
                    $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust().draw();
                } catch (e) {
                    console.warn('Error adjusting columns:', e);
                }
                
                // Alternative approach for specific tables
                const commonTableIds = [
                    'ordersTable', 
                    'deliveryItems', 
                    'stockTable', 
                    'itemsTable', 
                    'sayimListesiTable',
                    'orderItems',
                    'orderTable'
                ];
                
                commonTableIds.forEach(tableId => {
                    const table = $('#' + tableId);
                    if (table.length && $.fn.DataTable.isDataTable(table)) {
                        try {
                            table.DataTable().columns.adjust().responsive.recalc().draw();
                        } catch (e) {
                            console.warn(`Error adjusting table #${tableId}:`, e);
                        }
                    }
                });

                // Find all dataTables individually
                $('table.dataTable').each(function() {
                    try {
                        const tableInstance = $(this).DataTable();
                        tableInstance.columns.adjust().responsive.recalc().draw();
                    } catch (e) {
                        console.warn('Error adjusting individual table:', e);
                    }
                });
            }, 300);
        } catch (e) {
            console.warn('Error forcing DataTable redraw:', e);
        }
    }
}

// Add CSS to fix DataTable width issues
function addDataTableFixStyles() {
    // Check if style already exists
    if (document.getElementById('datatableFixStyles')) {
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'datatableFixStyles';
    styleEl.textContent = `
        .dataTables_wrapper {
            width: 100% !important;
        }
        .dataTables_scrollBody {
            width: 100% !important;
        }
        table.dataTable {
            width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
    `;
    document.head.appendChild(styleEl);
}

// Automatically adjust DataTables when window is resized
function setupAutoAdjustment() {
    // Listen for window resize
    window.addEventListener('resize', function() {
        forceRedrawDataTables();
    });
    
    // Listen for sidebar toggle
    document.querySelector('.main-content').addEventListener('transitionend', function(e) {
        if (e.propertyName === 'margin-left' || e.propertyName === 'width') {
            forceRedrawDataTables();
        }
    });
}

/**
 * DataTable Dark Mode Support
 * 
 * These functions help DataTables work correctly in dark mode
 */

// Safe wrapper for jQuery functions to prevent errors
function safeJQuery(fn) {
    if (window.jQuery && jQuery.fn.DataTable) {
        try {
            return fn();
        } catch (e) {
            console.warn('jQuery error:', e);
        }
    }
    return null;
}

// Add CSS for dark mode DataTables
function addDataTableDarkModeStyles() {
    if (document.getElementById('datatableDarkModeStyles')) {
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'datatableDarkModeStyles';
    styleEl.textContent = `
        /* DataTables Dark Mode Styles */
        body.dark-mode .dataTables_wrapper .dataTables_length,
        body.dark-mode .dataTables_wrapper .dataTables_filter,
        body.dark-mode .dataTables_wrapper .dataTables_info,
        body.dark-mode .dataTables_wrapper .dataTables_processing,
        body.dark-mode .dataTables_wrapper .dataTables_paginate {
            color: var(--text-color) !important;
        }
        
        body.dark-mode .dataTables_wrapper .dataTables_paginate .paginate_button {
            color: var(--text-color) !important;
        }
        
        body.dark-mode .dataTables_wrapper .dataTables_paginate .paginate_button.current,
        body.dark-mode .dataTables_wrapper .dataTables_paginate .paginate_button.current:hover {
            color: white !important;
            background: var(--primary-color) !important;
            border-color: var(--primary-color) !important;
        }
        
        body.dark-mode .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
            color: white !important;
            background: rgba(255, 77, 38, 0.7) !important;
            border-color: var(--primary-color) !important;
        }
        
        body.dark-mode table.dataTable tr.odd {
            background-color: var(--card-bg) !important;
        }
        
        body.dark-mode table.dataTable tr.even {
            background-color: rgba(255, 255, 255, 0.03) !important;
        }
        
        body.dark-mode table.dataTable tr.odd > .sorting_1,
        body.dark-mode table.dataTable tr.odd > .sorting_2,
        body.dark-mode table.dataTable tr.odd > .sorting_3 {
            background-color: rgba(0, 0, 0, 0.1) !important;
        }
        
        body.dark-mode table.dataTable tr.even > .sorting_1,
        body.dark-mode table.dataTable tr.even > .sorting_2,
        body.dark-mode table.dataTable tr.even > .sorting_3 {
            background-color: rgba(0, 0, 0, 0.15) !important;
        }
        
        body.dark-mode table.dataTable thead th,
        body.dark-mode table.dataTable thead td {
            background-color: var(--table-header-bg) !important;
            color: var(--text-color) !important;
            border-color: var(--border-color) !important;
        }
        
        body.dark-mode table.dataTable.row-border tbody th, 
        body.dark-mode table.dataTable.row-border tbody td, 
        body.dark-mode table.dataTable.display tbody th, 
        body.dark-mode table.dataTable.display tbody td {
            border-color: var(--border-color) !important;
        }
        
        /* Fix for alternate row coloring */
        body.dark-mode table.dataTable.stripe tbody tr.odd, 
        body.dark-mode table.dataTable.display tbody tr.odd {
            background-color: var(--card-bg) !important;
        }
        
        body.dark-mode table.dataTable.stripe tbody tr.even, 
        body.dark-mode table.dataTable.display tbody tr.even {
            background-color: rgba(255, 255, 255, 0.03) !important;
        }
        
        /* Fix for hover effect */
        body.dark-mode table.dataTable.hover tbody tr:hover, 
        body.dark-mode table.dataTable.display tbody tr:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
        }
        
        /* Fix for input fields */
        body.dark-mode .dataTables_filter input {
            background-color: var(--card-bg) !important;
            color: var(--text-color) !important;
            border-color: var(--border-color) !important;
        }
        
        body.dark-mode .dataTables_length select {
            background-color: var(--card-bg) !important;
            color: var(--text-color) !important;
            border-color: var(--border-color) !important;
        }

        /* Fix for specific components */
        body.dark-mode #orderSummaryModal .modal-content {
            background-color: var(--card-bg) !important;
            color: var(--text-color) !important;
        }
        
        body.dark-mode #orderSummaryModal .item-row {
            background-color: rgba(0, 0, 0, 0.2) !important;
        }
        
        body.dark-mode #orderSummaryModal .item-row:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
        }
        
        body.dark-mode .reply-section {
            background-color: rgba(0, 0, 0, 0.2) !important;
        }
        
        body.dark-mode .reply-item {
            border-color: var(--border-color) !important;
        }
        
        body.dark-mode .quantity-control .form-control {
            background-color: var(--card-bg) !important;
            color: var(--text-color) !important;
            border-color: var(--border-color) !important;
        }
    `;
    document.head.appendChild(styleEl);
}

// Apply dark mode to DataTables
function applyDarkModeToDataTables() {
    safeJQuery(() => {
        // Check for dark mode
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Apply necessary classes based on dark mode state
        $('table.dataTable').toggleClass('table-dark', isDarkMode);
        $('.dataTables_wrapper').toggleClass('dark-mode', isDarkMode);
        
        // Fix for inputs in dark mode
        if (isDarkMode) {
            $('.dataTables_filter input, .dataTables_length select').css({
                'background-color': 'var(--card-bg)',
                'color': 'var(--text-color)',
                'border-color': 'var(--border-color)'
            });
            
            // Fix for uretim-siparisi-olustur.html order summary modal
            $('#orderSummaryModal .modal-content').css({
                'background-color': 'var(--card-bg)',
                'color': 'var(--text-color)'
            });
            
            $('#orderSummaryModal .item-row').css({
                'background-color': 'rgba(0, 0, 0, 0.2)'
            });
            
            $('#orderSummaryModal .quantity-badge').css({
                'background-color': 'rgba(255, 255, 255, 0.05)',
                'color': 'var(--text-color)'
            });
            
            // Fix for ticket-detay.html reply section
            $('.reply-section').css({
                'background-color': 'rgba(0, 0, 0, 0.2)'
            });
            
            $('.reply-item').css({
                'border-color': 'var(--border-color)'
            });
            
            // Fix for image modal
            $('#imageModal .modal-content').css({
                'background-color': 'var(--card-bg)',
                'color': 'var(--text-color)'
            });
            
            // Fix for stok-sayimi-duzenle.html datatables
            $('.quantity-control .form-control').css({
                'background-color': 'var(--card-bg)',
                'color': 'var(--text-color)',
                'border-color': 'var(--border-color)'
            });
            
            $('.form-control[readonly], .readonly-field').css({
                'background-color': 'rgba(0, 0, 0, 0.2)',
                'color': 'rgba(224, 224, 224, 0.7)',
                'border-color': 'var(--border-color)'
            });
            
            $('.bg-light-warning').css({
                'background-color': 'rgba(255, 193, 7, 0.2)'
            });
        } else {
            $('.dataTables_filter input, .dataTables_length select').css({
                'background-color': '',
                'color': '',
                'border-color': ''
            });
            
            // Reset styles when dark mode is off
            $('#orderSummaryModal .modal-content, #imageModal .modal-content').css({
                'background-color': '',
                'color': ''
            });
            
            $('#orderSummaryModal .item-row').css({
                'background-color': ''
            });
            
            $('#orderSummaryModal .quantity-badge').css({
                'background-color': '',
                'color': ''
            });
            
            $('.reply-section').css({
                'background-color': ''
            });
            
            $('.reply-item').css({
                'border-color': ''
            });
            
            $('.quantity-control .form-control').css({
                'background-color': '',
                'color': '',
                'border-color': ''
            });
            
            $('.form-control[readonly], .readonly-field').css({
                'background-color': '',
                'color': '',
                'border-color': ''
            });
            
            $('.bg-light-warning').css({
                'background-color': ''
            });
        }
        
        // Redraw tables to apply styles properly
        forceRedrawDataTables();
    });
}

// Function to patch DataTables for dark mode compatibility
function patchDataTablesForDarkMode() {
    safeJQuery(() => {
        // If DataTable plugin exists
        if ($.fn.dataTable) {
            // Store the original dataTable initialization function
            const originalDataTable = $.fn.dataTable;
            
            // Override with our patched version
            $.fn.dataTable = function(options) {
                // Add our default options that work well with dark mode
                options = $.extend({
                    responsive: true,
                    autoWidth: false,
                    language: {
                        url: 'js/datatables-tr.json'
                    }
                }, options);
                
                // Call the original function with our merged options
                const instance = originalDataTable.apply(this, [options]);
                
                // Apply dark mode if the body has the dark-mode class
                if (document.body.classList.contains('dark-mode')) {
                    this.closest('.dataTables_wrapper').addClass('dark-mode');
                    this.addClass('table-dark');
                }
                
                return instance;
            };
            
            // Copy over all properties
            for (const prop in originalDataTable) {
                if (originalDataTable.hasOwnProperty(prop)) {
                    $.fn.dataTable[prop] = originalDataTable[prop];
                }
            }
        }
    });
}

// Function to safely initialize or reinitialize a DataTable
function initializeOrResetDataTable(tableId, options) {
    safeJQuery(() => {
        // Check if DataTable already exists and destroy it first
        if ($.fn.DataTable.isDataTable('#' + tableId)) {
            $('#' + tableId).DataTable().destroy();
            console.log('DataTable #' + tableId + ' destroyed before re-initialization');
        }
        
        // Initialize with new options
        $('#' + tableId).DataTable(options);
    });
}

// Function to reinitialize all DataTables on a page
function reinitializeAllDataTables() {
    safeJQuery(() => {
        const tables = [
            'countTable',
            'transferTable', 
            'ordersTable', 
            'itemsTable',
            'orderTable',
            'sayimListesiTable'
        ];
        
        tables.forEach(tableId => {
            if ($('#' + tableId).length && $.fn.DataTable.isDataTable('#' + tableId)) {
                try {
                    $('#' + tableId).DataTable().destroy();
                    console.log('DataTable #' + tableId + ' destroyed during global reinitialization');
                    
                    // Re-initialize with default options
                    $('#' + tableId).DataTable({
                        responsive: true,
                        language: {
                            url: 'js/datatables-tr.json'
                        }
                    });
                } catch (e) {
                    console.warn('Error reinitializing table #' + tableId, e);
                }
            }
        });
    });
}

// Early initialization to suppress DataTables warnings
(function suppressDataTablesWarnings() {
    // Function to disable DataTables warnings
    function disableDTWarnings() {
        if (window.jQuery && $.fn && $.fn.dataTable) {
            // Disable DataTables error reporting
            $.fn.dataTable.ext.errMode = 'none';
            
            // Disable jQuery error reporting for DataTables
            const originalError = $.error;
            $.error = function(message) {
                // Suppress "Cannot reinitialise DataTable" errors
                if (message && (
                    message.indexOf('Cannot reinitialise DataTable') !== -1 || 
                    message.indexOf('DataTables warning') !== -1
                )) {
                    return;
                }
                
                // Pass through other errors
                return originalError.apply(this, arguments);
            };
            
            console.log('DataTables warnings disabled');
        } else {
            // Try again later if jQuery or DataTables not yet loaded
            setTimeout(disableDTWarnings, 100);
        }
    }
    
    // Start attempting to disable warnings
    disableDTWarnings();
})();

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add CSS fixes
    addDataTableFixStyles();
    addDataTableDarkModeStyles();
    
    // Setup auto-adjustment
    setupAutoAdjustment();
    
    // Global helper to check and reset DataTables
    window.DT_Helper = {
        init: initializeOrResetDataTable,
        reinitAll: reinitializeAllDataTables,
        redraw: forceRedrawDataTables
    };
    
    // Wait a moment for jQuery and DataTables to be ready
    setTimeout(() => {
        // Patch DataTables for dark mode
        patchDataTablesForDarkMode();
        
        // Apply dark mode to existing tables
        applyDarkModeToDataTables();
        
        // Listen for dark mode toggle events
        document.addEventListener('darkModeChanged', function() {
            applyDarkModeToDataTables();
        });
        
        // For backward compatibility, also monitor body class changes
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    applyDarkModeToDataTables();
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
        
        // Only add the refresh button if the page has DataTables
        if (window.$ && $.fn.DataTable && $.fn.DataTable.tables) {
            const hasTables = safeJQuery(() => $.fn.dataTable.tables().length > 0);
            if (hasTables) {
                addDataTableRefreshButton();
                forceRedrawDataTables();
            }
        }
    }, 500);
});

// Call these functions on script load to affect all tables
disableDataTableCaching();
patchAllDataTablesForNoCache();

// Add to any existing initialization function
document.addEventListener('DOMContentLoaded', function() {
    disableDataTableCaching();
    patchAllDataTablesForNoCache();
});

// Expose the functions in the global dataTableHelper object at the end of the file
window.dataTableHelper = window.dataTableHelper || {};
$.extend(window.dataTableHelper, {
    // Add the new functions to the existing helper object
    disableCaching: disableDataTableCaching,
    patchForNoCache: patchAllDataTablesForNoCache,
    refreshWithFreshData: refreshDataTableWithFreshData,
    // ... existing properties ...
});

/**
 * Add function to refresh a specific DataTable with fresh data
 */
function refreshDataTableWithFreshData(tableId) {
    if (window.$ && $.fn.DataTable) {
        try {
            const table = $('#' + tableId);
            if (table.length && $.fn.DataTable.isDataTable(table)) {
                const dt = table.DataTable();
                
                // If table has AJAX source
                if (dt.ajax && dt.ajax.url) {
                    // Add cache-busting parameter
                    const originalUrl = dt.ajax.url();
                    const cacheBuster = new Date().getTime();
                    const url = originalUrl.split('?')[0] + '?_=' + cacheBuster;
                    
                    console.log(`Reloading fresh data for table #${tableId} from ${url}`);
                    dt.ajax.url(url).load(null, false);
                    return true;
                } else {
                    console.warn(`Table #${tableId} does not have AJAX source`);
                }
            } else {
                console.warn(`Table #${tableId} is not a DataTable`);
            }
        } catch (e) {
            console.error(`Error refreshing table #${tableId}:`, e);
        }
    }
    return false;
} 