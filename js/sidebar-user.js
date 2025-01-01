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
    } catch (error) {
        console.error('Error loading sidebar user:', error);
    }
});
