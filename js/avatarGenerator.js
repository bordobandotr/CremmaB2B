function generateAvatar(username, size = 40) {
    // Get initials from username
    const initials = username
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

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

    // Create SVG
    const color = getColor(username);
    const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="${color}" rx="${size/4}"/>
            <text 
                x="50%" 
                y="50%" 
                dy=".1em"
                fill="white" 
                font-family="Arial, sans-serif" 
                font-size="${size/2}px" 
                text-anchor="middle" 
                dominant-baseline="middle"
                style="font-weight: bold;">
                ${initials}
            </text>
        </svg>
    `;

    console.log(svg);
    // Convert SVG to data URL
    return `data:image/svg+xml;base64,${btoa(svg)}`;    
}

// Function to update avatar in the sidebar
function updateUserAvatar(username, elementId = 'userAvatar') {
    const avatarElement = document.getElementById(elementId);
    if (avatarElement) {
        avatarElement.src = generateAvatar(username);
        avatarElement.alt = username;
    }
}

// Example usage:
// updateUserAvatar('John Doe');
