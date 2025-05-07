/**
 * Dark Mode Functionality
 * Handles toggling between light and dark mode and stores user preference
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if dark mode toggle button exists in DOM
    const toggleButton = document.getElementById('darkModeToggle');
    if (!toggleButton) {
        console.warn('Dark mode toggle button not found in the DOM');
        return;
    }

    // Meta theme color elements
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const metaMsTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
    const metaNavButtonColor = document.querySelector('meta[name="msapplication-navbutton-color"]');

    // Theme colors
    const lightThemeColor = "#FFFFFF";
    const darkThemeColor = "#121212";

    // Function to update meta theme colors
    function updateMetaThemeColors(isDark) {
        const themeColor = isDark ? darkThemeColor : lightThemeColor;
        
        if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor);
        if (metaMsTileColor) metaMsTileColor.setAttribute('content', themeColor);
        if (metaNavButtonColor) metaNavButtonColor.setAttribute('content', themeColor);
    }

    // Function to handle waiting for jQuery
    function whenJQueryReady(callback) {
        if (window.jQuery) {
            callback();
        } else {
            setTimeout(function() {
                whenJQueryReady(callback);
            }, 100);
        }
    }

    // Safely apply dark mode to DataTables
    function safelyHandleDataTables(isDark) {
        whenJQueryReady(function() {
            try {
                if ($.fn && $.fn.dataTable) {
                    // Wait a moment for tables to initialize
                    setTimeout(function() {
                        // First handle table wrappers
                        $('.dataTables_wrapper').toggleClass('dark-mode', isDark);
                        
                        // Then handle tables
                        $('table.dataTable').toggleClass('table-dark', isDark);
                        
                        // Special handling for specific pages
                        handleSpecificPageDarkMode(isDark);
                        
                        // Then try to redraw tables if they exist
                        try {
                            if ($.fn.dataTable.tables) {
                                $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
                            }
                        } catch (e) {
                            console.warn('Error adjusting DataTables:', e);
                        }
                    }, 200);
                }
            } catch (e) {
                console.warn('Error handling DataTables in dark mode:', e);
            }
        });
    }
    
    // Special handling for specific pages
    function handleSpecificPageDarkMode(isDark) {
        whenJQueryReady(function() {
            try {
                // Current page detection based on URL
                const currentPath = window.location.pathname;
                const currentPage = currentPath.split('/').pop();
                
                // Common elements across all pages
                if (isDark) {
                    // Apply dark mode to input group buttons
                    $('.input-group .btn').css({
                        'border-color': 'var(--border-color)',
                        'background-color': 'rgba(0, 0, 0, 0.2)'
                    });
                    
                    // Fix for form controls
                    $('.form-control, .form-select').css({
                        'background-color': 'var(--card-bg)',
                        'color': 'var(--text-color)',
                        'border-color': 'var(--border-color)'
                    });
                    
                    // Fix for modals
                    $('.modal-content').css({
                        'background-color': 'var(--card-bg)',
                        'color': 'var(--text-color)'
                    });
                    
                    $('.modal-header, .modal-footer').css({
                        'border-color': 'var(--border-color)'
                    });
                } else {
                    // Reset styles when dark mode is turned off
                    $('.input-group .btn').css({
                        'border-color': '',
                        'background-color': ''
                    });
                    
                    $('.form-control, .form-select').css({
                        'background-color': '',
                        'color': '',
                        'border-color': ''
                    });
                    
                    $('.modal-content').css({
                        'background-color': '',
                        'color': ''
                    });
                    
                    $('.modal-header, .modal-footer').css({
                        'border-color': ''
                    });
                }
                
                // uretim-siparisi-olustur.html specific fixes
                if (currentPage.includes('uretim-siparisi')) {
                    if (isDark) {
                        // Order summary modal
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
                        
                        // DataTable order quantity inputs
                        $('#orderTable .input-group .form-control').css({
                            'background-color': 'var(--card-bg)',
                            'color': 'var(--text-color)',
                            'border-color': 'var(--border-color)'
                        });
                        
                        // Selected filters tags
                        $('.selected-tag').css({
                            'background-color': 'rgba(255, 255, 255, 0.1)',
                            'border-color': 'var(--border-color)',
                            'color': 'var(--text-color)'
                        });
                    } else {
                        $('#orderSummaryModal .modal-content').css({
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
                        
                        $('#orderTable .input-group .form-control').css({
                            'background-color': '',
                            'color': '',
                            'border-color': ''
                        });
                        
                        $('.selected-tag').css({
                            'background-color': '',
                            'border-color': '',
                            'color': ''
                        });
                    }
                }
                
                // ticket-detay.html specific fixes
                if (currentPage.includes('ticket-detay')) {
                    if (isDark) {
                        // Reply section
                        $('.reply-section').css({
                            'background-color': 'rgba(0, 0, 0, 0.2)'
                        });
                        
                        $('.reply-item').css({
                            'border-color': 'var(--border-color)'
                        });
                        
                        $('#imageModal .modal-content').css({
                            'background-color': 'var(--card-bg)',
                            'color': 'var(--text-color)'
                        });
                        
                        $('#imageModal .modal-header').css({
                            'border-color': 'var(--border-color)'
                        });
                    } else {
                        $('.reply-section').css({
                            'background-color': ''
                        });
                        
                        $('.reply-item').css({
                            'border-color': ''
                        });
                        
                        $('#imageModal .modal-content').css({
                            'background-color': '',
                            'color': ''
                        });
                        
                        $('#imageModal .modal-header').css({
                            'border-color': ''
                        });
                    }
                }
                
                // stok-sayimi-duzenle.html specific fixes
                if (currentPage.includes('stok-sayimi')) {
                    if (isDark) {
                        // Quantity controls
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
                        
                        $('.progress').css({
                            'background-color': 'rgba(0, 0, 0, 0.2)'
                        });
                    } else {
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
                        
                        $('.progress').css({
                            'background-color': ''
                        });
                    }
                }
                
                // Call SafeDT.applyDarkMode if available
                if (window.SafeDT && typeof window.SafeDT.applyDarkMode === 'function') {
                    window.SafeDT.applyDarkMode(isDark);
                }
                
            } catch (e) {
                console.warn('Error handling specific page dark mode:', e);
            }
        });
    }

    // Function to toggle dark mode
    function toggleDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('darkMode', isDark.toString());
        updateMetaThemeColors(isDark);
        
        // Safely handle DataTables and specific page elements
        safelyHandleDataTables(isDark);
        
        // Apply to all iframes (if any)
        try {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) {
                        iframeDoc.body.classList.toggle('dark-mode', isDark);
                    }
                } catch (e) {
                    // Cross-origin iframe access might fail, ignore those
                }
            });
        } catch (e) {
            console.warn('Error applying dark mode to iframes:', e);
        }
        
        // Dispatch event for other scripts to listen for dark mode changes
        const event = new CustomEvent('darkModeChanged', { 
            detail: { isDarkMode: isDark },
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
        
        // Log for debugging
        console.log('Dark mode set to:', isDark);
    }

    // Check user's preference from localStorage
    const storedPreference = localStorage.getItem('darkMode');
    const isDarkMode = storedPreference === 'true';
    
    // Check system preference if no stored preference
    const prefersDarkMode = window.matchMedia && 
                           window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply dark mode if preference exists or system prefers dark mode
    if (isDarkMode || (prefersDarkMode && storedPreference === null)) {
        toggleDarkMode(true);
    } else {
        toggleDarkMode(false);
    }

    // Toggle dark mode when button is clicked
    toggleButton.addEventListener('click', function() {
        const isDarkModeNow = !document.body.classList.contains('dark-mode');
        toggleDarkMode(isDarkModeNow);
    });

    // Listen for system preference changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            // Only apply system preference if user hasn't manually set a preference
            if (localStorage.getItem('darkMode') === null) {
                const systemPrefersDark = event.matches;
                toggleDarkMode(systemPrefersDark);
            }
        });
    }
    
    // Error recovery - check if theme appears to be wrong and fix it
    setTimeout(function() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        const hasClass = document.body.classList.contains('dark-mode');
        
        if (isDarkMode !== hasClass) {
            console.warn('Dark mode inconsistency detected, fixing...');
            toggleDarkMode(isDarkMode);
        }
    }, 2000);
});

// Early initialization function to prevent flash of unstyled content
(function() {
    // Check if dark mode is enabled before DOM is loaded
    if (localStorage.getItem('darkMode') === 'true') {
        // Add inline styles to <html> for immediate effect
        const style = document.createElement('style');
        style.textContent = `
            html, body {
                background-color: #121212 !important;
                color: #E0E0E0 !important;
            }
        `;
        document.head.appendChild(style);
        
        // Apply class to body as soon as it's available
        document.addEventListener('DOMContentLoaded', function() {
            document.body.classList.add('dark-mode');
            
            // Dispatch event for early listeners
            const event = new CustomEvent('darkModeChanged', { 
                detail: { isDarkMode: true } 
            });
            document.dispatchEvent(event);
        });
    }
})(); 