document.getElementById('loginForm').addEventListener('submit', async function (e) {
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
        const sapResponse = await axios.post(
            "/api/login",
            {
                UserName: validationResponse.data.user.username, // This will be admin username
                Password: validationResponse.data.user.password, // This will be admin password
                CompanyDB: "CREMMA_CANLI_2209",
            }
        );

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

            console.log('SessionId:', sapResponse.data.SessionId);
            console.log('SessionTimeout:', sapResponse.data.SessionTimeout);
            console.log('Version:', sapResponse.data.Version);
            console.log('User Name:', validationResponse.data.user.name);
            console.log('User Type:', validationResponse.data.user.type);
            console.log('Branch Code:', validationResponse.data.user.branchCode);
            console.log('Branch Name:', validationResponse.data.user.branchName);



            // Hide loading screen and redirect
            hideLoading();
            window.location.href = 'index.html';
        } else {
            hideLoading();
            errorMessage.textContent = 'SAP bağlantısında hata oluştu';
        }
    } catch (error) {
        console.error('Login error:', error);

        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        hideLoading();

        if (error.response) {
            // Sunucudan bir hata kodu ile yanıt geldi (4xx, 5xx)
            console.error('Error response:', error.response);
            const status = error.response.status;
            const data = error.response.data;

            if (status === 401) {
                errorMessage.textContent = 'Kullanıcı adı veya şifre hatalı.';
            } else if (status >= 500) {
                // Sunucu taraflı hatalar (500, 502, 503 vb.)
                if (data && data.details && typeof data.details === 'string') {
                    if (data.details.includes('ECONNREFUSED')) {
                        errorMessage.textContent = 'SAP sunucusuna bağlanılamadı. Lütfen sistem yöneticinize başvurun.';
                    } else {
                        errorMessage.textContent = 'SAP sunucusunda bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
                    }
                } else {
                    errorMessage.textContent = 'Sunucuda beklenmedik bir hata oluştu (Kod: ' + status + ').';
                }
            } else {
                errorMessage.textContent = 'Giriş yapılırken bir hata oluştu (Kod: ' + status + ').';
            }
        } else if (error.request) {
            // İstek yapıldı ancak sunucudan yanıt alınamadı
            console.error('Error request:', error.request);
            errorMessage.textContent = 'Sunucuya ulaşılamadı. Lütfen ağ bağlantınızı kontrol edin veya sistem yöneticinize başvurun.';
        } else {
            // İsteği hazırlarken bir hata oluştu
            errorMessage.textContent = 'Giriş isteği oluşturulurken bir hata oluştu: ' + error.message;
        }

        errorMessage.style.display = 'block';
    }
});
