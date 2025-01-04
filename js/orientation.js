// Add orientation message to the body
function createOrientationMessage() {
    if (!document.querySelector('.orientation-message')) {
        const orientationMessage = document.createElement('div');
        orientationMessage.className = 'orientation-message';
        orientationMessage.innerHTML = `
            <i class="bi bi-phone-landscape" style="font-size: 48px;"></i>
            <h3>Lütfen cihazınızı yan çevirin</h3>
            <p>Bu uygulama yalnızca yatay modda çalışmaktadır.</p>
        `;
        document.body.appendChild(orientationMessage);
    }
}

// Initialize orientation message
document.addEventListener('DOMContentLoaded', createOrientationMessage);

// Check orientation on load
window.addEventListener('load', function() {
    checkOrientation();
});

// Handle orientation changes
window.addEventListener('orientationchange', function() {
    setTimeout(checkOrientation, 100);
});

// Check orientation function
function checkOrientation() {
    const orientationMessage = document.querySelector('.orientation-message');
    if (!orientationMessage) {
        createOrientationMessage();
    }
    
    if (window.orientation === undefined) {
        // Use matchMedia if orientation is not supported
        if (window.matchMedia("(orientation: portrait)").matches) {
            showPortraitMessage();
        } else {
            showLandscapeContent();
        }
    } else {
        // Use window.orientation
        if (window.orientation === 0 || window.orientation === 180) {
            showPortraitMessage();
        } else {
            showLandscapeContent();
        }
    }
}

function showPortraitMessage() {
    const orientationMessage = document.querySelector('.orientation-message');
    if (orientationMessage) {
        orientationMessage.style.display = 'flex';
    }
    document.body.style.overflow = 'hidden';
}

function showLandscapeContent() {
    const orientationMessage = document.querySelector('.orientation-message');
    if (orientationMessage) {
        orientationMessage.style.display = 'none';
    }
    document.body.style.overflow = '';
}

// Try to lock orientation if supported
if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(function(error) {
        console.log('Orientation lock failed:', error);
    });
}
