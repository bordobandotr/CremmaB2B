document.addEventListener('DOMContentLoaded', async function() {
    const headContent = await fetch('./components/header.html')
        .then(response => response.text());
    
    // Insert the header content after the existing head elements
    const head = document.head;
    const existingMeta = head.querySelector('meta[charset]');
    
    if (existingMeta) {
        existingMeta.insertAdjacentHTML('afterend', headContent);
    } else {
        head.insertAdjacentHTML('afterbegin', headContent);
    }

    const logoContent = await fetch('./components/logo_container.html')
        .then(response => response.text());
    
    // Insert the header content after the existing head elements
    const logo = document.getElementById('logo-container');
    if (logo) {
        logo.insertAdjacentHTML('afterbegin', logoContent);
    }
    

});
