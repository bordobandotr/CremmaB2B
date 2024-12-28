document.addEventListener('DOMContentLoaded', function() {
    // Load navigation menu
    fetch('nav-menu.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('sidebar-nav').innerHTML = data;
            
            // Set active class based on current page
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        })
        .catch(error => console.error('Error loading navigation menu:', error));
});
