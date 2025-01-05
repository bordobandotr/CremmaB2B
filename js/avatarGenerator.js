function generateAvatar(username, size = 40) {
    try {
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        // Generate a consistent color based on username
        const getColor = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            // Predefined color palette for better aesthetics
            const colors = [
                '#FF6B6B', // Red
                '#4ECDC4', // Teal
                '#45B7D1', // Blue
                '#96CEB4', // Green
                '#FFEEAD', // Yellow
                '#D4A5A5', // Pink
                '#9B59B6', // Purple
                '#3498DB', // Light Blue
                '#E67E22', // Orange
                '#1ABC9C'  // Turquoise
            ];
            
            return colors[Math.abs(hash) % colors.length];
        };

        // Get background color
        const bgColor = getColor(username);

        // Draw background
        context.fillStyle = bgColor;
        context.beginPath();
        context.arc(size/2, size/2, size/2, 0, Math.PI * 2);
        context.fill();

        // Get initials
        const initials = username
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        // Draw text
        context.fillStyle = '#FFFFFF';
        context.font = `bold ${size/2}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(initials, size/2, size/2);

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error generating avatar:', error);
        return null;
    }
}

function updateUserAvatar(username, elementId = 'userAvatar') {
    try {
        if (!username) {
            console.warn('No username provided for avatar generation');
            return;
        }
        
        const avatarElement = document.getElementById(elementId);
        if (!avatarElement) {
            console.warn(`Avatar element with id '${elementId}' not found`);
            return;
        }

        const avatarUrl = generateAvatar(username, 40);
        if (avatarUrl) {
            avatarElement.src = avatarUrl;
            avatarElement.alt = `${username}'s avatar`;
            console.log('Avatar successfully updated for:', username);
        }
    } catch (error) {
        console.error('Error updating user avatar:', error);
    }
}
