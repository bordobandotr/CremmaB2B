document.addEventListener('DOMContentLoaded', async function() {
    const sidebarUserElement = document.getElementById('sidebar-user');
    if (!sidebarUserElement) return;

    try {
        // Get user info from localStorage
        const userName = localStorage.getItem('userName') || '-';
        const branchName = localStorage.getItem('branchName') || '-';
        
        // Load sidebar user template
        const response = await fetch('/components/sidebar_user.html');
        const html = await response.text();
        
        // Insert the HTML
        sidebarUserElement.innerHTML = html;
        
        // Update user information
        const userNameElement = sidebarUserElement.querySelector('#userName');
        const branchNameElement = sidebarUserElement.querySelector('#branchName');
        
        if (userNameElement) userNameElement.textContent = userName;
        if (branchNameElement) branchNameElement.textContent = branchName;

        // Initialize dark mode toggle if it exists
        const darkModeToggle = sidebarUserElement.querySelector('#darkModeToggle');
        if (darkModeToggle) {
            // Initialize the toggle state based on current mode
            const isDarkMode = document.body.classList.contains('dark-mode');
            
            // Add click event listener if not already added by dark-mode.js
            darkModeToggle.addEventListener('click', function() {
                document.body.classList.toggle('dark-mode');
                const isDarkModeNow = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDarkModeNow.toString());
            });
        }
    } catch (error) {
        console.error('Error loading sidebar user:', error);
    }
});
