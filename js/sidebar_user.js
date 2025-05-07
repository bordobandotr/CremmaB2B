// Sidebar User Component JavaScript
// Handles user data display, avatar generation and dark mode functionality

// Set a global flag to indicate this file is loaded
window.sidebarUserJsLoaded = true;

// Wait for avatarGenerator.js to be ready - it's loaded by loadHeader.js
function initializeUser() {
    try {
        console.log('initializeUser started');
        
        // Get user data from localStorage
        const branchUsers = JSON.parse(localStorage.getItem('branchUsers'));
        const user = branchUsers ? branchUsers.find(user => user.type === 'branch_manager') : null;
        const branchName = localStorage.getItem('branchName');
        const userName = localStorage.getItem('userName'); // Yedek kullanıcı adı

        console.log('Branch Users:', branchUsers);
        console.log('User:', user);
        console.log('Branch Name:', branchName);
        console.log('User Name:', userName);

        // Update user name and branch name
        if (user || userName) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user ? user.name : (userName || '-');
                console.log('User name updated to:', userNameElement.textContent);
            }
            
            // Update avatar using avatarGenerator.js
            if (typeof generateAvatar === 'function' && typeof updateUserAvatar === 'function') {
                updateUserAvatar(user ? user.name : (userName || 'User'));
                console.log('Avatar generation attempted for:', user ? user.name : (userName || 'User'));
            } else {
                // If avatarGenerator.js functions aren't available yet, load it explicitly
                loadAvatarGenerator();
            }
        }

        if (branchName) {
            const branchElement = document.getElementById('branchName');
            if (branchElement) {
                branchElement.textContent = branchName;
                console.log('Branch name updated to:', branchElement.textContent);
            }
        }
        
        // Initialize dark mode
        initializeDarkMode();
    } catch (error) {
        console.error('Error initializing user:', error);
    }
}

// Function to load avatarGenerator.js if not already loaded
function loadAvatarGenerator() {
    console.log('Loading avatarGenerator.js explicitly');
    const script = document.createElement('script');
    
    // Get absolute path to JS folder by considering current page location
    const currentPath = window.location.pathname;
    const pathToRoot = currentPath.includes('/pages/') ? '../' : '';
    
    script.src = pathToRoot + 'js/avatarGenerator.js';
    console.log('Loading avatarGenerator.js from:', script.src);
    
    script.onload = function() {
        console.log('avatarGenerator.js loaded successfully');
        // Try updating avatar again after script is loaded
        const userName = localStorage.getItem('userName');
        const branchUsers = JSON.parse(localStorage.getItem('branchUsers'));
        const user = branchUsers ? branchUsers.find(user => user.type === 'branch_manager') : null;
        updateUserAvatar(user ? user.name : (userName || 'User'));
    };
    script.onerror = function() {
        console.error('Failed to load avatarGenerator.js');
    };
    document.head.appendChild(script);
}

// Initialize dark mode toggle
function initializeDarkMode() {
    try {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) {
            console.error('Dark mode toggle button not found');
            return;
        }
        
        // Check current dark mode state
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        console.log('Dark mode state:', isDarkMode);
        
        // Update body class based on stored preference
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Setup dark mode toggle
        darkModeToggle.addEventListener('click', function() {
            console.log('Dark mode toggle clicked');
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            
            // Dispatch event for other components to react
            const event = new CustomEvent('darkModeChanged', { detail: { isDark } });
            document.dispatchEvent(event);
            
            console.log('Dark mode set to:', isDark);
        });
        
        console.log('Dark mode toggle initialized');
    } catch (error) {
        console.error('Error initializing dark mode:', error);
    }
}

// Initialize the component when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing sidebar user component');
    // Give a slight delay to ensure all other scripts are loaded
    setTimeout(initializeUser, 300);
});

// Also initialize if loaded after DOM is already ready
if (document.readyState !== 'loading') {
    console.log('DOM already loaded, delaying initialization');
    setTimeout(initializeUser, 300);
} 