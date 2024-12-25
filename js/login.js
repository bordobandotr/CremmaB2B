document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
// window.location.href = "index.html";

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        console.log('Attempting login with:', { username, CompanyDB: "CREMMA_TEST_111224" });
        
        const response = await axios.post(
          "/b1s/v1/Login",
          {
            UserName: username,
            Password: password,
            CompanyDB: "CREMMA_TEST_111224",
          }
        );

        console.log('Login response:', response);

        if (response.data && response.data.SessionId) {
            localStorage.setItem('sessionId', response.data.SessionId);
            localStorage.setItem('sessionTimeout', response.data.SessionTimeout);
            localStorage.setItem('b1Version', response.data.Version);
            
            window.location.href = 'index.html';
        } else {
            errorMessage.textContent = 'Geçersiz kullanıcı adı veya şifre';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        
        if (error.response) {
            console.error('Error response:', error.response);
            errorMessage.textContent = error.response.data.error.message.value || 'Giriş yapılırken bir hata oluştu';
        } else if (error.request) {
            console.error('Error request:', error.request);
            errorMessage.textContent = 'Sunucuya bağlanılamadı';
        } else {
            errorMessage.textContent = 'Giriş yapılırken bir hata oluştu';
        }
        
        errorMessage.style.display = 'block';
    }
});
