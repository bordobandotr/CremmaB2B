document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loadingScreen = document.getElementById('loadingScreen');

    const showLoading = () => {
        loadingScreen.style.display = 'flex';
        // Trigger reflow
        loadingScreen.offsetHeight;
        loadingScreen.classList.add('show');
    };

    const hideLoading = () => {
        loadingScreen.classList.remove('show');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300); // Match transition duration
    };

    try {
        // Show loading screen
        showLoading();
        errorMessage.style.display = 'none';

        // First validate user against our JSON data
        const validationResponse = await axios.post('/api/validate-user', {
            username: username,
            password: password
        });

        if (!validationResponse.data.valid) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            hideLoading();
            errorMessage.textContent = validationResponse.data.message;
            errorMessage.style.display = 'block';
            return;
        }

        // If validation successful, proceed with SAP login using admin credentials
        const sapResponse = await axios.post('/b1s/v1/Login', {
            UserName: validationResponse.data.user.username,  // This will be admin username
            Password: validationResponse.data.user.password,  // This will be admin password
            CompanyDB: "CREMMA_TEST_111224"
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

        if (sapResponse.data && sapResponse.data.SessionId) {
            // Store all user information
            localStorage.setItem('userName', validationResponse.data.user.name);
            localStorage.setItem('userType', validationResponse.data.user.type);
            localStorage.setItem('branchCode', validationResponse.data.user.branchCode);
            localStorage.setItem('branchName', validationResponse.data.user.branchName);
            localStorage.setItem('sessionId', sapResponse.data.SessionId);
            localStorage.setItem('sessionTimeout', sapResponse.data.SessionTimeout);
            localStorage.setItem('b1Version', sapResponse.data.Version);
            
            // Hide loading screen and redirect
            hideLoading();
            window.location.href = 'index.html';
        } else {
            hideLoading();
            errorMessage.textContent = 'SAP bağlantısında hata oluştu';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
        // Hide loading screen
        hideLoading();
        
        if (error.response) {
            console.error('Error response:', error.response);
            errorMessage.textContent = error.response.data.error?.message?.value || 'Giriş yapılırken bir hata oluştu';
        } else if (error.request) {
            console.error('Error request:', error.request);
            errorMessage.textContent = 'Sunucuya bağlanılamadı';
        } else {
            errorMessage.textContent = 'Giriş yapılırken bir hata oluştu';
        }
        
        errorMessage.style.display = 'block';
    }
});
