document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
// window.location.href = "index.html";

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        const response = await axios.post(
          "/b1s/v1/Login",
          {
            UserName: username,
            Password: password,
            CompanyDB: "CREMMA_TEST_111224",
          }
        );

        console.log('Login response:', response);
        console.log('Login response status:', response.status);
        console.log('Login response headers:', response.headers);
        console.log('Login response data:', response.data);

        if (response.data.SessionId) {
            // Store SessionId in localStorage

            

            localStorage.setItem('sessionId', response.data.SessionId);
            localStorage.setItem('sessionTimeout', response.data.SessionTimeout);
            
            // You might want to store other session info as well
            localStorage.setItem('b1Version', response.data.Version);
            
            // Redirect to index page
            window.location.href = 'index.html';
        } else {
            errorMessage.textContent = 'Login failed: No session ID received';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
        console.error('Login error:', error);
    }
});
