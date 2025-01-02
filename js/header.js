// Header functionality
async function loadUserInfo() {
    try {
        const response = await api.makeAuthenticatedRequest('b1s/v1/Users?$select=UserCode,UserName');
        if (response && response.value && response.value.length > 0) {
            const user = response.value[0];
            document.getElementById('userInfo').innerHTML = `
                <i class="bi bi-person-circle me-1"></i>
                ${user.UserName || user.UserCode}
            `;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        document.getElementById('userInfo').innerHTML = `
            <i class="bi bi-person-circle me-1"></i>
            <span class="text-danger">Kullanıcı bilgisi alınamadı</span>
        `;
    }
}

// function logout() {
//     try {
//         // Clear session storage
//         localStorage.removeItem('sessionId');
//         localStorage.removeItem('sessionTimeout');
        
//         // Redirect to login page
//         window.location.href = 'login.html';
//     } catch (error) {
//         console.error('Error during logout:', error);
//         alert('Çıkış yapılırken bir hata oluştu.');
//     }
// }

// Load user info when the page loads
document.addEventListener('DOMContentLoaded', loadUserInfo);
