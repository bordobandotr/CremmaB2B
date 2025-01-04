document.addEventListener('DOMContentLoaded', async function() {
    const navContent = await fetch('./components/nav-menu.html')
        .then(response => response.text());
    
    const nav = document.getElementById('sidebar-nav');
    if (nav) {
        nav.innerHTML = navContent;
        
        // Get current page URL
        const currentPage = window.location.pathname;
        
        // Define page groups
        const pageGroups = {
            'dashboard': [
                '/index.html',
            ],
            'transfer': [
                '/transferler.html',
                '/transfer-olustur.html',
                '/transfer-detay.html',
                '/transfer-teslim.html'
            ],
            'ana-depo': [
                '/anadepo-siparisleri.html',
                '/anadepo-siparisi-olustur.html',
                '/anadepo-siparisi-detay.html',
                '/anadepo-siparisi-teslim.html'
            ],
            'dis-tedarik': [
                '/dis-tedarik-siparisleri.html',
                '/dis-tedarik-siparisi-olustur.html',
                '/dis-tedarik-siparisi-detay.html',
                '/dis-tedarik-siparisi-teslim.html'
            ],
            'uretim': [
                '/uretim-siparisleri.html',
                '/uretim-siparisi-olustur.html',
                '/uretim-siparisi-detay.html',
                '/uretim-siparisi-teslim.html'
            ]
            // Add other page groups here if needed
        };
        
        // Remove all active classes first
        nav.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Check if current page belongs to a group and set active class accordingly
        for (const [groupKey, pages] of Object.entries(pageGroups)) {
            if (pages.some(page => currentPage.endsWith(page))) {
                const groupLink = nav.querySelector(`[data-page="${groupKey}"]`);
                if (groupLink) {
                    groupLink.classList.add('active');
                }
            }
        }
    }
});
