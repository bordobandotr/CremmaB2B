// API utility functions
const api = {
    // Get the stored session ID
    getSessionId: () => localStorage.getItem('sessionId'),

    // Check if session is valid
    isSessionValid: () => {
        const sessionId = localStorage.getItem('sessionId');
        return !!sessionId;
    },

    // Create axios instance with session header
    createAuthenticatedRequest: () => {
        const sessionId = localStorage.getItem('sessionId');
        return axios.create({
            baseURL: 'http://10.21.22.11:50000/',
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/json',
                'Cookie': `B1SESSION=${sessionId}`
            }
        });
    },

    // Make an authenticated request
    makeAuthenticatedRequest: async (endpoint, method = 'GET', data = null) => {
        const axiosInstance = api.createAuthenticatedRequest();
        
        try {
            const config = {
                method,
                url: endpoint
            };
            
            if (data) {
                config.data = data;
            }
            
            const response = await axiosInstance(config);
            return response.data;
        } catch (error) {
            console.error('Error making authenticated request:', error);
            if (error.response) {
                console.error('Error response:', error.response);
                console.error('Error status:', error.response.status);
                console.error('Error headers:', error.response.headers);
            }
            throw error;
        }
    }
};

// Example usage:
// const result = await api.makeAuthenticatedRequest('/b1s/v1/BusinessPartners', 'GET');
