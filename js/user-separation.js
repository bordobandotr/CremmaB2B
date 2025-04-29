// Get current user type from localStorage
const currentUserType = localStorage.getItem('userType');

async function loadAndSeparateUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        const otherUsersContainer = document.getElementById('otherUsers');
        const matchingUsersContainer = document.getElementById('matchingUsers');

        // Clear existing content
        otherUsersContainer.innerHTML = '';
        matchingUsersContainer.innerHTML = '';

        users.forEach(user => {
            const userElement = createUserElement(user);
            
            if (user.userType === currentUserType) {
                matchingUsersContainer.appendChild(userElement);
            } else {
                otherUsersContainer.appendChild(userElement);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function createUserElement(user) {
    const div = document.createElement('div');
    div.className = 'user-item';
    
    // Add active-user class if this is the current user
    const currentUserId = localStorage.getItem('userId');
    if (user.id === currentUserId) {
        div.classList.add('active-user');
    }

    div.innerHTML = `
        <img src="${user.avatar || 'img/default-avatar.png'}" alt="${user.name}" onerror="this.src='img/default-avatar.png'">
        <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-type">${getUserTypeText(user.userType)}</div>
        </div>
    `;

    return div;
}

function getUserTypeText(userType) {
    const userTypes = {
        'admin': 'Yönetici',
        'manager': 'Müdür',
        'employee': 'Çalışan',
        'customer': 'Müşteri'
        // Add more user types as needed
    };
    return userTypes[userType] || userType;
}

// Load users when the page loads
document.addEventListener('DOMContentLoaded', loadAndSeparateUsers);
