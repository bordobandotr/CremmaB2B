/**
 * Safe DataTables Initialization
 * Prevents "Cannot reinitialize DataTable" errors
 */

// Wait for jQuery and DataTables to be available
function whenDTReady(callback) {
    if (window.jQuery && $.fn && $.fn.DataTable) {
        callback();
    } else {
        setTimeout(function() {
            whenDTReady(callback);
        }, 100);
    }
}

// Suppress DataTables warnings
whenDTReady(function() {
    // Disable console warnings from DataTables
    $.fn.dataTable.ext.errMode = 'none';
    
    // Intercept and silence jQuery's error reporting for DataTables
    const originalJQueryError = $.error;
    $.error = function(message) {
        if (message && message.indexOf('DataTables warning') !== -1) {
            // Silently ignore DataTables warnings
            console.debug('Suppressed DataTables warning:', message);
            return;
        }
        // Pass other errors to the original handler
        return originalJQueryError.apply(this, arguments);
    };
    
    console.log('DataTables warnings suppressed successfully');
});

// Global registry of initialized tables
window.initializedTables = window.initializedTables || {};

/**
 * Auto-fix all DataTables on the page
 * Finds all initialized DataTables and ensures they are properly set up
 */
function autoFixAllDataTables() {
    whenDTReady(function() {
        try {
            // Get all table IDs with DataTables initialized
            const tableIds = [];
            $('table.dataTable').each(function() {
                const id = $(this).attr('id');
                if (id) tableIds.push(id);
            });
            
            console.log('Found DataTables to fix:', tableIds);
            
            // Fix each table
            tableIds.forEach(id => {
                const tableSelector = '#' + id;
                
                // Only if it's really a DataTable
                if ($.fn.DataTable.isDataTable(tableSelector)) {
                    try {
                        // Backup the data
                        const data = $(tableSelector).DataTable().rows().data().toArray();
                        const options = $(tableSelector).DataTable().init();
                        
                        // Destroy the table
                        $(tableSelector).DataTable().destroy();
                        
                        // Re-initialize with the same options
                        const dt = $(tableSelector).DataTable(options);
                        
                        // Re-add the data if it had any
                        if (data && data.length) {
                            dt.clear().rows.add(data).draw();
                        }
                        
                        console.log(`DataTable "${id}" has been auto-fixed`);
                    } catch (e) {
                        console.warn(`Could not auto-fix DataTable "${id}":`, e);
                    }
                }
            });
        } catch (e) {
            console.error('Error in autoFixAllDataTables:', e);
        }
    });
}

/**
 * Safely initialize a DataTable
 * This prevents the "Cannot reinitialize DataTable" error
 * 
 * @param {string} tableId - The ID of the table (without #)
 * @param {object} options - DataTable initialization options
 * @returns {object|null} - The DataTable instance or null if initialization failed
 */
function safeDataTable(tableId, options) {
    // Default options
    options = options || {};
    
    return new Promise((resolve, reject) => {
        whenDTReady(function() {
            try {
                const tableSelector = '#' + tableId;
                const $table = $(tableSelector);
                
                if (!$table.length) {
                    console.warn(`Table with ID "${tableId}" not found in the DOM`);
                    resolve(null);
                    return;
                }
                
                // Check if already initialized
                if ($.fn.DataTable.isDataTable(tableSelector)) {
                    // Destroy existing instance
                    try {
                        $(tableSelector).DataTable().destroy();
                    } catch (e) {
                        console.warn(`Error destroying existing DataTable "${tableId}":`, e);
                        // Force destroy by removing all DataTable classes and data
                        $table.removeClass('dataTable display responsive nowrap');
                        $table.removeData();
                    }
                    
                    // Re-create table element to ensure clean state
                    try {
                        const $parent = $table.parent();
                        const $newTable = $('<table></table>')
                            .attr('id', tableId)
                            .attr('class', $table.attr('class'))
                            .html($table.html());
                        
                        // Replace old table with new one
                        $table.replaceWith($newTable);
                    } catch (e) {
                        console.warn(`Error recreating table element "${tableId}":`, e);
                    }
                    
                    console.log(`DataTable "${tableId}" was reset before re-initialization`);
                }
                
                // Default options that work with our styling
                const defaultOptions = {
                    responsive: true,
                    language: {
                        url: 'js/datatables-tr.json'
                    }
                };
                
                // Merge with custom options
                const mergedOptions = $.extend({}, defaultOptions, options);
                
                // Initialize DataTable
                const dt = $('#' + tableId).DataTable(mergedOptions);
                
                // Store in registry
                window.initializedTables[tableId] = dt;
                
                // Apply dark mode if needed
                if (document.body.classList.contains('dark-mode')) {
                    $('#' + tableId).addClass('table-dark');
                    $('#' + tableId).closest('.dataTables_wrapper').addClass('dark-mode');
                }
                
                console.log(`DataTable "${tableId}" initialized successfully`);
                resolve(dt);
            } catch (e) {
                console.error(`Error initializing DataTable "${tableId}":`, e);
                reject(e);
            }
        });
    });
}

/**
 * Clears a DataTable's data but keeps the initialization
 * 
 * @param {string} tableId - The ID of the table (without #)
 */
function clearDataTable(tableId) {
    whenDTReady(function() {
        try {
            const tableSelector = '#' + tableId;
            const $table = $(tableSelector);
            
            if (!$table.length) {
                console.warn(`Table with ID "${tableId}" not found in the DOM`);
                return;
            }
            
            // Check if initialized
            if ($.fn.DataTable.isDataTable(tableSelector)) {
                // Clear data
                $(tableSelector).DataTable().clear().draw();
                console.log(`DataTable "${tableId}" data cleared`);
            }
        } catch (e) {
            console.error(`Error clearing DataTable "${tableId}":`, e);
        }
    });
}

/**
 * Destroys a DataTable
 * 
 * @param {string} tableId - The ID of the table (without #)
 */
function destroyDataTable(tableId) {
    whenDTReady(function() {
        try {
            const tableSelector = '#' + tableId;
            const $table = $(tableSelector);
            
            if (!$table.length) {
                console.warn(`Table with ID "${tableId}" not found in the DOM`);
                return;
            }
            
            // Check if initialized
            if ($.fn.DataTable.isDataTable(tableSelector)) {
                // Destroy instance
                $(tableSelector).DataTable().destroy();
                console.log(`DataTable "${tableId}" destroyed`);
                
                // Remove from registry
                delete window.initializedTables[tableId];
            }
        } catch (e) {
            console.error(`Error destroying DataTable "${tableId}":`, e);
        }
    });
}

/**
 * Redraw a DataTable
 * 
 * @param {string} tableId - The ID of the table (without #)
 */
function redrawDataTable(tableId) {
    whenDTReady(function() {
        try {
            const tableSelector = '#' + tableId;
            const $table = $(tableSelector);
            
            if (!$table.length) {
                console.warn(`Table with ID "${tableId}" not found in the DOM`);
                return;
            }
            
            // Check if initialized
            if ($.fn.DataTable.isDataTable(tableSelector)) {
                // Redraw
                $(tableSelector).DataTable().columns.adjust().responsive.recalc().draw();
                console.log(`DataTable "${tableId}" redrawn`);
            }
        } catch (e) {
            console.error(`Error redrawing DataTable "${tableId}":`, e);
        }
    });
}

/**
 * Apply dark mode styling to all DataTables
 * This function should be called when dark mode is toggled
 * 
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 */
function applyDarkModeToAllDataTables(isDarkMode) {
    whenDTReady(function() {
        try {
            // Apply dark mode class to all table wrappers
            $('.dataTables_wrapper').toggleClass('dark-mode', isDarkMode);
            
            // Apply dark mode class to all datatables
            $('table.dataTable').toggleClass('table-dark', isDarkMode);
            
            // Apply specific fixes for standard tables
            const commonTableIds = [
                'orderTable', 
                'orderItems',
                'itemsTable', 
                'countTable',
                'sayimListesiTable'
            ];
            
            // Apply to common tables by ID
            commonTableIds.forEach(tableId => {
                if ($('#' + tableId).length) {
                    $('#' + tableId).toggleClass('table-dark', isDarkMode);
                    $('#' + tableId).closest('.dataTables_wrapper').toggleClass('dark-mode', isDarkMode);
                }
            });
            
            // Fix filter inputs
            if (isDarkMode) {
                $('.dataTables_filter input, .dataTables_length select').css({
                    'background-color': 'var(--card-bg)',
                    'color': 'var(--text-color)',
                    'border-color': 'var(--border-color)'
                });
            } else {
                $('.dataTables_filter input, .dataTables_length select').css({
                    'background-color': '',
                    'color': '',
                    'border-color': ''
                });
            }
            
            // Redraw all tables to apply styles properly
            setTimeout(function() {
                try {
                    if ($.fn.dataTable.tables) {
                        $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust().draw();
                    }
                } catch (e) {
                    console.warn('Error adjusting DataTables after dark mode change:', e);
                }
            }, 200);
            
            console.log('Dark mode applied to all DataTables:', isDarkMode);
        } catch (e) {
            console.error('Error applying dark mode to DataTables:', e);
        }
    });
}

// Listener for dark mode changes
document.addEventListener('darkModeChanged', function(e) {
    const isDarkMode = e.detail.isDarkMode;
    applyDarkModeToAllDataTables(isDarkMode);
});

// Run auto-fix when the document is ready
$(document).ready(function() {
    // Delay to allow all other scripts to initialize tables first
    setTimeout(autoFixAllDataTables, 500);
    
    // Check initial dark mode status
    const isDarkMode = document.body.classList.contains('dark-mode');
    applyDarkModeToAllDataTables(isDarkMode);
    
    // Fix for order summary modals in dark mode
    if (isDarkMode) {
        $('#orderSummaryModal .modal-content, #imageModal .modal-content').css({
            'background-color': 'var(--card-bg)',
            'color': 'var(--text-color)'
        });
        
        $('.reply-section').css({
            'background-color': 'rgba(0, 0, 0, 0.2)'
        });
    }
});

// Expose functions to global scope
window.SafeDT = {
    init: safeDataTable,
    clear: clearDataTable,
    destroy: destroyDataTable,
    redraw: redrawDataTable,
    fixAll: autoFixAllDataTables,
    applyDarkMode: applyDarkModeToAllDataTables
}; 