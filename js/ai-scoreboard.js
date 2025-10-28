document.addEventListener('DOMContentLoaded', () => {
    const scoreboard = document.getElementById('new-ai-scoreboard');
    if (!scoreboard) return;

    const scoreElement = scoreboard.querySelector('.ai-score-board-score-number');
    const backgroundSparklesContainer = scoreboard.querySelector('.ai-score-board-sparkles-container');
    const foregroundSparklesContainer = scoreboard.querySelector('.ai-score-board-foreground-sparkles-container');

    // 1. Sayı Sayacı Animasyonu
    const finalScore = 92;
    let score = 0;
    const animationDuration = 2000; // 2 saniye
    const frameRate = 60; // 60fps
    const totalFrames = animationDuration / (1000 / frameRate);
    let currentFrame = 0;

    const counter = setInterval(() => {
        currentFrame++;
        const progress = currentFrame / totalFrames;
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out
        const currentScore = Math.round(finalScore * easedProgress);
        
        scoreElement.textContent = currentScore;

        if (currentFrame >= totalFrames) {
            clearInterval(counter);
            scoreElement.textContent = finalScore;
        }
    }, 1000 / frameRate);

    // 2. Parıltı Efektleri
    const createSparkles = (container, numSparkles, className, minDuration, maxDuration, minDelay, maxDelay) => {
        for (let i = 0; i < numSparkles; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = className;
            sparkle.style.top = `${Math.random() * 100}%`;
            sparkle.style.left = `${Math.random() * 100}%`;
            const duration = Math.random() * (maxDuration - minDuration) + minDuration;
            const delay = Math.random() * (maxDelay - minDelay) + minDelay;
            sparkle.style.animationDuration = `${duration}s`;
            sparkle.style.animationDelay = `${delay}s`;
            container.appendChild(sparkle);
        }
    };

    createSparkles(backgroundSparklesContainer, 80, 'ai-score-board-sparkle', 3, 8, 0, 5);
    createSparkles(foregroundSparklesContainer, 8, 'ai-score-board-foreground-sparkle', 3, 5, 0, 8);
});
