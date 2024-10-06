// Set up the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get input element for player name, shoot button, and start button
const playerNameInput = document.getElementById('playerNameInput');
const shootButton = document.getElementById('shootButton');  // Existing shoot button setup
const startButton = document.getElementById('startButton');  // Add this for start button setup

// Show start button only on mobile and disable initially
if (window.innerWidth <= 768) {
    startButton.style.display = 'block';  // Make it visible on mobile
    startButton.disabled = true;  // Keep it disabled initially
}

// Enable the start button once the player name is entered
playerNameInput.addEventListener('input', function () {
    if (playerNameInput.value.trim() !== "") {
        startButton.classList.add('enabled'); // Make the button enabled (opacity changes)
        startButton.disabled = false;  // Enable the button
    } else {
        startButton.classList.remove('enabled'); // Disable it again if input is cleared
        startButton.disabled = true;  // Disable the button
    }
});

// Start the game when the start button is clicked (mobile)
startButton.addEventListener('click', function () {
    if (!gameStarted && playerNameInput.value.trim() !== "") {
        hideStartScreen();
        startCountdown();  // Begin countdown and start the game
    }
});

// Player class
class Player {
    constructor(x, y, speed) {
        this.x = x;  // Player's X position
        this.y = y;  // Player's Y position
        this.speed = speed;  // Player's movement speed
        this.width = 150;  // Player's width
        this.height = 150;  // Player's height
    }

    // Draw the player (cheese) on the screen
    draw(ctx, image) {
        ctx.drawImage(image, this.x, this.y, this.width, this.height);
    }

    // Move the player left or right when the arrow keys are pressed
    move(left, right, canvasWidth) {
        if (left && this.x > 0) this.x -= this.speed;  // Move left
        if (right && this.x + this.width < canvasWidth) this.x += this.speed;  // Move right
    }
}

// Set canvas size initially (fixed to viewport size)
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Mute Button
let muteState = false;
const muteButton = document.createElement('button');
muteButton.innerText = 'Mute';
muteButton.classList.add('mute-button');  // Use the CSS class
document.body.appendChild(muteButton);

// Mute button functionality
muteButton.addEventListener('click', () => {
    muteState = !muteState;
    if (muteState) {
        backgroundMusic.muted = true;
        mouseHitSound.muted = true;
        shooterHitSound.muted = true;
        muteButton.innerText = 'Unmute';
    } else {
        backgroundMusic.muted = false;
        mouseHitSound.muted = false;
        shooterHitSound.muted = false;
        muteButton.innerText = 'Mute';
    }
});

// Hide the shoot button on the start screen
shootButton.style.display = 'none';

// Variables for game state
let playerName = "";
let gameStarted = false;
let countdown = 3;
let countdownInterval;
let canShoot = true;
const shootCooldown = 500;
let gameLoopRequest;
let explosions = [];
let baseDropInterval = 2000;
let frequencyScalingFactor = 0.8;
let lastScoreThreshold = 0;

// Game variables
let player = new Player(canvas.width / 2 - 75, canvas.height - 150, 100);
let score = 0;  // Set initial score to 0
let numLives = 5;
let bullets = [];
let mice = [];
let mouseBullets = [];
let keys = {};
let gameEnded = false;
let highScores = [];

// Leaderboard button coordinates and dimensions
const buttonWidth = 180;
const buttonHeight = 60;
let playAgainButton = {};
let quitButton = {};

// Load images and sounds (same as before)
const cheeseImage = new Image();
cheeseImage.src = 'img/shooter_img.png';

const mouseImageRight = new Image();
mouseImageRight.src = 'img/mouse_right.png';

const mouseImageLeft = new Image();
mouseImageLeft.src = 'img/mouse_left.png';

const backgroundImage = new Image();
backgroundImage.src = 'img/cheesebg.webp'; // Game background image

const backgroundMusic = new Audio('sounds/game2.wav');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.6;

const mouseHitSound = new Audio('sounds/mouse_hit.wav');
mouseHitSound.volume = 1;

const shooterHitSound = new Audio('sounds/shooter_hit.ogg');
shooterHitSound.volume = 1;

// Touch control variables
let isTouching = false;
let startX = 0;
let lastTouchX = 0;

const sensitivity = 0.5;

// Add touch event listeners for movement
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, false);
canvas.addEventListener('touchend', handleTouchEnd, false);

function handleTouchStart(event) {
    event.preventDefault();  // Prevent default action for touch
    isTouching = true;
    startX = event.touches[0].clientX; 
    lastTouchX = startX; 
}

function handleTouchMove(event) {
    event.preventDefault();  // Prevent default swiping gestures
    if (isTouching) {
        const touchX = event.touches[0].clientX;
        const deltaX = touchX - lastTouchX;
        lastTouchX = touchX;
        const sensitivity = 3;
        player.x += deltaX * sensitivity;

        // Ensure the player stays within the bounds of the screen
        player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));
    }
}

function handleTouchEnd(event) {
    event.preventDefault();  // Prevent default touch end behavior
    isTouching = false;
}

// Show the mobile shoot button only on touch devices when the game starts
function showShootButton() {
    if ('ontouchstart' in document.documentElement) {
        shootButton.style.display = 'block';  // Show button on mobile devices
    } else {
        shootButton.style.display = 'none';   // Ensure it's hidden on non-touch devices
    }
}

// Add event listener to the shoot button
shootButton.addEventListener('click', () => {
    if (!gameEnded && canShoot) {
        bullets.push({
            x: player.x + 75,  // Center the bullet
            y: player.y,
            width: 5,
            height: 20
        });
        canShoot = false;
        setTimeout(() => canShoot = true, shootCooldown);  // Cooldown for shooting
    }
});

// Function to ensure the Matemasie font is fully loaded before use
function loadMatemasieFont() {
    return new Promise((resolve, reject) => {
        // Load the specific font and size you will use
        document.fonts.load('400px "Matemasie"').then(() => {
            console.log('Matemasie font loaded successfully.');
            resolve();
        }).catch((error) => {
            console.error('Error loading Matemasie font:', error);
            reject(error);
        });
    });
}

function showStartScreen() {
    playerNameInput.style.display = "block";
    shootButton.style.display = "none";  // Hide shoot button on start screen
    muteButton.style.display = "block";  // Show mute button on start screen

    // Show start button on mobile, hide it on desktop
    if (isMobile()) {
        startButton.style.display = 'block';  // Show on mobile
        startButton.disabled = true;  // Initially disabled until a name is entered
    } else {
        startButton.style.display = 'none';  // Hide on desktop
    }
}

function hideStartScreen() {
    playerNameInput.style.display = "none";
    muteButton.style.display = "none";  // Hide mute button once the game starts
}


// Listen for 'Enter' key to start the game after entering the player name
document.addEventListener('keydown', startGameOnEnter);

function startGameOnEnter(e) {
    if (e.code === 'Enter' && !gameStarted) {
        playerName = playerNameInput.value.trim();
        if (playerName === "") {
            alert("Please enter your name to start the game!");
            return;
        }
        hideStartScreen();
        startCountdown();
    }
}

// Countdown before starting the game
function startCountdown() {
    startButton.style.display = 'none';
    loadMatemasieFont().then(() => {
        countdown = 3;
        countdownInterval = setInterval(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'black';

            if (isMobile()) {
                ctx.font = '80px "Matemasie", sans-serif';  // Smaller font for mobile
            } else {
                ctx.font = '150px "Matemasie", sans-serif';  // Bigger font for desktop
            }

            if (countdown > 0) {
                ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
            } else if (countdown === 0) {
                ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
            }

            // Only show instructions on desktop, not on mobile
            if (!isMobile()) {
                ctx.font = '30px "Arial", sans-serif';  // Instructions font
                ctx.fillText('Left, Right ARROW to move and SPACE to shoot', canvas.width / 2, canvas.height - 50);
            }

            countdown--;

            if (countdown < 0) {
                clearInterval(countdownInterval);
                startGame();
            }
        }, 1000);
    }).catch(err => {
        console.error('Font loading failed:', err);
        // Fallback: Start countdown anyway in case of font load failure
        startCountdownWithoutFont();
    });
}



// Hide the shoot button initially on the start screen
shootButton.style.display = 'none';

function startGame() {
    gameStarted = true;
    startButton.style.display = 'none'; 
    showShootButton();  // Show shoot button for mobile devices
    loadMice();
    startBackgroundMusic();
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    gameLoop();
}

// Main game loop
function gameLoop() {
    if (!gameEnded && gameStarted) {
        update();
        render();
        gameLoopRequest = requestAnimationFrame(gameLoop);
    }
}

// Load initial mice
function loadMice() {
    for (let i = 0; i < 4; i++) {
        regenerateMouse();
    }
}

// Regenerate a new mouse
function regenerateMouse() {
    const minY = 100;
    const maxY = canvas.height / 2 - 75;
    const direction = Math.random() < 0.5 ? 1 : -1;
    const image = direction === 1 ? mouseImageRight : mouseImageLeft;

    let mouseWidth, mouseHeight;

    // Check if it's mobile to set the size
    if (isMobile()) {
        mouseWidth = 75;
        mouseHeight = 75;
    } else {
        mouseWidth = 100;
        mouseHeight = 100;
    }

    const mouse = {
        x: Math.random() * (canvas.width - mouseWidth),
        y: Math.random() * (maxY - minY) + minY,
        width: mouseWidth,
        height: mouseHeight,
        direction: direction,
        speed: Math.random() * (9.5 - 3) + 3,
        scoreValue: 1,  // Assign scoreValue to each mouse
        image: image
    };

    mice.push(mouse);
    mouse.bulletInterval = setTimeout(() => dropMouseBullets(mouse), Math.random() * 2000);
}

// Remove a mouse safely from the game
function removeMouse(mouse) {
    const index = mice.indexOf(mouse);
    if (index !== -1) {
        clearTimeout(mouse.bulletInterval);
        mice.splice(index, 1);
    }
}

// Drop bullets from mice with dynamic frequency adjustment
function dropMouseBullets(mouse) {
    if (!gameEnded && gameStarted && mice.includes(mouse)) {

        let bulletWidth, bulletHeight;

        // Check if it's mobile to set the size
        if (isMobile()) {
            bulletWidth = 3;
            bulletHeight = 15;
        } else {
            bulletWidth = 5;
            bulletHeight = 20;
        }

        mouseBullets.push({
            x: mouse.x + mouse.width / 2,
            y: mouse.y + mouse.height,
            width: bulletWidth,
            height: bulletHeight
        });

        const newInterval = calculateDropInterval();
        mouse.bulletInterval = setTimeout(() => {
            if (!gameEnded && mice.includes(mouse)) {
                dropMouseBullets(mouse);
            }
        }, newInterval);
    }
}


// Calculate the new bullet drop interval based on the score
function calculateDropInterval() {
    if (score >= lastScoreThreshold + 5) {
        baseDropInterval *= frequencyScalingFactor;
        lastScoreThreshold = score;
    }
    return baseDropInterval;
}

// Clear all mouse bullet intervals to prevent duplication
function clearMiceIntervals() {
    mice.forEach(mouse => {
        clearTimeout(mouse.bulletInterval);
    });
}

// Collision function
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.height + rect1.y > rect2.y
    );
}

// Update the game state
function update() {
    if (gameEnded || !gameStarted) return;

    // Move cheese (shooter)
    player.move(keys['ArrowLeft'], keys['ArrowRight'], canvas.width);

    // Move bullets
    bullets = bullets.filter(bullet => bullet.y > 0);
    bullets.forEach(bullet => bullet.y -= 10);

    // Move mice
    mice.forEach(mouse => {
        mouse.x += mouse.speed * mouse.direction;
        if (mouse.x <= 0 || mouse.x + mouse.width >= canvas.width) {
            mouse.direction *= -1;
            mouse.image = mouse.direction === 1 ? mouseImageRight : mouseImageLeft;
        }
    });

    // Check for collisions between bullets and mice
    bullets.forEach((bullet, bulletIndex) => {
        mice.forEach((mouse, mouseIndex) => {
            if (checkCollision(bullet, mouse)) {
                mouseHitSound.play();
                score += mouse.scoreValue;  // Increment score

                // Create explosion on mouse hit
                explosions.push({
                    x: mouse.x + mouse.width / 2,
                    y: mouse.y + mouse.height / 2,
                    radius: 0,
                    maxRadius: 150,
                    alpha: 1,
                });

                // Remove the hit mouse and bullet
                removeMouse(mouse);
                bullets.splice(bulletIndex, 1);
                regenerateMouse();
            }
        });
    });

    // Move mouse bullets
    mouseBullets = mouseBullets.filter(bullet => bullet.y < canvas.height);
    mouseBullets.forEach(bullet => bullet.y += 7);

    // Check for collisions between mouse bullets and the shooter (cheese)
    mouseBullets.forEach((bullet, bulletIndex) => {
        const shooterHitboxWidth = 100;
        const shooterHitboxHeight = 100;
        const shooterHitboxX = player.x + (150 - shooterHitboxWidth) / 2;
        const shooterHitboxY = player.y + (150 - shooterHitboxHeight) / 2;

        const shooterHitbox = {
            x: shooterHitboxX,
            y: shooterHitboxY,
            width: shooterHitboxWidth,
            height: shooterHitboxHeight
        };

        if (checkCollision(bullet, shooterHitbox)) {
            shooterHitSound.play();
            numLives -= 1;

            // This part creates the explosion for the cheese
    explosions.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        type: 'line',  // Type 'line' for line-style explosion
        lines: 40,  // Number of lines in the explosion
        length: 0,
        maxLength: 200,
        alpha: 1,
    });

            mouseBullets.splice(bulletIndex, 1);

            if (numLives <= 0) {
                gameOver();
            }
        }
    });
}

// Render the game state to the canvas
function render() {
    if (gameEnded || !gameStarted) return;

    ctx.clearRect(0, 80, canvas.width, canvas.height);  // Clear only the area above the HUD (score/lives)
    player.draw(ctx, cheeseImage);

    bullets.forEach(bullet => {
        ctx.fillStyle = 'rgba(219, 124, 0)';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    mouseBullets.forEach(bullet => {
        ctx.fillStyle = 'rgba(44, 23, 3)';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    mice.forEach(mouse => {
        ctx.drawImage(mouse.image, mouse.x, mouse.y, mouse.width, mouse.height);
    });

        // Render explosions (Line explosion logic added for cheese)
    explosions.forEach((explosion, index) => {
        if (explosion.type === 'line') {
            // Handle line explosion type
            const angleStep = (Math.PI * 2) / explosion.lines;
            for (let i = 0; i < explosion.lines; i++) {
                const angle = i * angleStep;
                const xEnd = explosion.x + Math.cos(angle) * explosion.length;
                const yEnd = explosion.y + Math.sin(angle) * explosion.length;

                ctx.beginPath();
                ctx.moveTo(explosion.x, explosion.y);
                ctx.lineTo(xEnd, yEnd);
                ctx.strokeStyle = `rgba(189, 57, 0, ${explosion.alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            explosion.length += 4;
            explosion.alpha -= 0.04;

            if (explosion.length >= explosion.maxLength || explosion.alpha <= 0) {
                explosions.splice(index, 1);
            }
        } else {
            // Handle circular explosions (for mice)
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(255, 69, 0, ${explosion.alpha})`;
            ctx.fill();

            explosion.radius += 4;
            explosion.alpha -= 0.04;

            if (explosion.radius >= explosion.maxRadius || explosion.alpha <= 0) {
                explosions.splice(index, 1);
            }
        }
    });

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, 80);

    ctx.fillStyle = 'yellow';
    ctx.font = '40px "Matemasie", sans-serif';
    ctx.fillText('Score: ' + score, 100, 50);  // Render correct score
    ctx.fillText('Lives: ' + numLives, 300, 50);
}

// Game over logic
function gameOver() {
    saveHighScore(playerName, score);
    gameEnded = true;

    shootButton.style.display ='none';

    explosions.push({
        x: player.x + 75,
        y: player.y + 75,
        type: 'finalCircle',
        radius: 0,
        maxRadius: 400,
        alpha: 1,
    });

    cancelAnimationFrame(gameLoopRequest);
    finalExplosionAnimation();
}

// Final explosion animation
function finalExplosionAnimation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let allExplosionsComplete = true;

    explosions.forEach((explosion, index) => {
        if (explosion.type === 'finalCircle') {
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2, false);
            ctx.fillStyle = `rgba(255, 69, 0, ${explosion.alpha})`;
            ctx.fill();

            explosion.radius += 6;
            explosion.alpha -= 0.03;

            if (explosion.radius >= explosion.maxRadius || explosion.alpha <= 0) {
                explosions.splice(index, 1);
            } else {
                allExplosionsComplete = false;
            }
        }
    });

    if (!allExplosionsComplete) {
        requestAnimationFrame(finalExplosionAnimation);
    } else {
        explosions = [];
        cancelAnimationFrame(gameLoopRequest);
        setTimeout(gameOverTextAnimation, 500);
    }
}

// Animation for game over text
function gameOverTextAnimation() {
    let opacity = 0;
    const fadeSpeed = 0.02;

    function drawGameOverText() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Adjust font size for mobile or desktop
        if (isMobile()) {
            ctx.font = '60px "Matemasie", sans-serif';  // Smaller font for mobile
        } else {
            ctx.font = '150px "Matemasie", sans-serif';  // Bigger font for desktop
        }

        ctx.fillStyle = `rgba(255, 145, 0, ${opacity})`;
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);

        opacity += fadeSpeed;

        if (opacity < 1) {
            requestAnimationFrame(drawGameOverText);
        } else {
            setTimeout(displayLeaderboard, 1000);
        }
    }

    drawGameOverText();
}


// Save high score to the server (FastAPI) and localStorage
function saveHighScore(playerName, score) {
    let storedScores = localStorage.getItem('highScores');
    if (storedScores) {
        highScores = JSON.parse(storedScores);
    } else {
        highScores = [];
    }

    highScores.push({ name: playerName, score: score });
    highScores.sort((a, b) => b.score - a.score);

    if (highScores.length > 10) {
        highScores = highScores.slice(0, 10);
    }

    localStorage.setItem('highScores', JSON.stringify(highScores));

    const data = {
        player_name: playerName,
        score: score
    };

    fetch("https://parmbot-29ed122e8ba4.herokuapp.com/submit_score/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Score submitted successfully:', data.message);
    })
    .catch((error) => {
        console.error('Error submitting score:', error);
    });
}

// Load high scores from localStorage when the game or leaderboard initializes
function loadHighScores() {
    let storedScores = localStorage.getItem('highScores');
    if (storedScores) {
        highScores = JSON.parse(storedScores);
    } else {
        highScores = [];  // Initialize an empty array if no scores are saved
    }
}

// Display leaderboard function
function displayLeaderboard() {
    loadHighScores();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cancelAnimationFrame(gameLoopRequest);

    ctx.fillStyle = 'black';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(canvas.width / 4, 50, canvas.width / 2, canvas.height - 100);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'white';
    ctx.font = '36px "Matemasie", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$PARM Leaderboard', canvas.width / 2, 100);

    ctx.font = '24px "Matemasie", sans-serif';
    highScores.forEach((entry, index) => {
        ctx.fillText(`${index + 1}. ${entry.name}: ${entry.score}`, canvas.width / 2, 150 + index * 30);
    });

    // Remove any existing leaderboard buttons before creating new ones
    const existingButtons = document.querySelector('.leaderboard-buttons');
    if (existingButtons) {
        existingButtons.remove();  // Remove old buttons if they exist
    }

    // Create container for leaderboard buttons
    const leaderboardDiv = document.createElement('div');
    leaderboardDiv.classList.add('leaderboard-buttons');

    // Create Play Again button
    const playAgainButton = document.createElement('button');
    playAgainButton.classList.add('play-again-button');
    playAgainButton.innerText = 'Play Again';
    playAgainButton.addEventListener('click', resetGame); // Add click event to Play Again button

    // Create Quit button
    const quitButton = document.createElement('button');
    quitButton.classList.add('quit-button');
    quitButton.innerText = 'Quit';
    quitButton.addEventListener('click', quitGame); // Add click event to Quit button

    leaderboardDiv.appendChild(playAgainButton);
    leaderboardDiv.appendChild(quitButton);

    document.body.appendChild(leaderboardDiv);  // Add buttons to the body
}


// Handle click events on the leaderboard buttons
function handleLeaderboardClick(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (mouseX >= playAgainButton.x && mouseX <= playAgainButton.x + playAgainButton.width &&
        mouseY >= playAgainButton.y && mouseY <= playAgainButton.y + playAgainButton.height) {
        resetGame();
    }

    if (mouseX >= quitButton.x && mouseX <= quitButton.x + quitButton.width &&
        mouseY >= quitButton.y && mouseY <= quitButton.y + quitButton.height) {
        quitGame();
    }
}

// Function to prompt the user to manually close the tab
function quitGame() {
    window.location.href = 'https://parm-on-sol.com/';
}

// Shoot bullets when space is pressed, with cooldown
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameEnded && canShoot) {
        bullets.push({
            x: player.x + 75,
            y: player.y,
            width: 5,
            height: 20
        });
        canShoot = false;
        setTimeout(() => canShoot = true, shootCooldown);
    }
});

// Function to reset the game state
function resetGame() {
    // Remove leaderboard buttons before resetting the game
    const leaderboardDiv = document.querySelector('.leaderboard-buttons');
    if (leaderboardDiv) {
        leaderboardDiv.remove();
    }

    cancelAnimationFrame(gameLoopRequest);
    clearInterval(countdownInterval);
    clearMiceIntervals();

    gameStarted = false;
    gameEnded = false;
    score = 0;
    numLives = 5;
    bullets = [];
    mice = [];
    mouseBullets = [];
    explosions = [];
    keys = {};
    canShoot = true;
    player.x = canvas.width / 2 - 75;
    player.y = canvas.height - 150;
    baseDropInterval = 2000;
    lastScoreThreshold = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Show start screen
    showStartScreen();

    // Re-enable and show the start button only on mobile
    if (isMobile()) {
        startButton.style.display = 'block';  // Only visible on mobile
        startButton.disabled = true;  // Keep disabled initially
    } else {
        startButton.style.display = 'none';  // Always hidden on desktop
    }

    document.removeEventListener('keydown', startGameOnEnter);
    document.addEventListener('keydown', startGameOnEnter);

    canvas.removeEventListener('click', handleLeaderboardClick);
    canvas.addEventListener('click', handleLeaderboardClick);
}



// Function to start the background music after user interaction
function startBackgroundMusic() {
    backgroundMusic.play().catch(error => {
        console.log("Background music play was prevented:", error);
    });
}

// Listen for user interaction (click or keypress) to start background music
document.body.addEventListener('click', startBackgroundMusic, { once: true });
document.body.addEventListener('keydown', startBackgroundMusic, { once: true });

// Track key presses
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Show the start screen when the page loads
showStartScreen();

// Function to check if the screen is small (mobile)
function isMobile() {
    return window.innerWidth <= 768;
}

// Function to check if the screen is small (mobile)
function isMobile() {
    return window.innerWidth <= 768;
}

// Function to adjust sizes for mobile or desktop
function adjustSizes() {
    if (isMobile()) {
        // Smaller sizes for mobile
        player.width = 100;
        player.height = 100;

        mice.forEach(mouse => {
            mouse.width = 75;
            mouse.height = 75;
        });

        bullets.forEach(bullet => {
            bullet.width = 3;
            bullet.height = 15;
        });

        // Adjust game text size for mobile
        ctx.font = '80px "Matemasie", sans-serif';  // Smaller text for countdown/game over
    } else {
        // Default sizes for desktop
        player.width = 150;
        player.height = 150;

        mice.forEach(mouse => {
            mouse.width = 100;
            mouse.height = 100;
        });

        bullets.forEach(bullet => {
            bullet.width = 5;
            bullet.height = 20;
        });

        // Adjust game text size for desktop
        ctx.font = '150px "Matemasie", sans-serif';  // Bigger text for countdown/game over
    }
}

// Make sure the game adjusts sizes when the window is resized or when it loads
window.addEventListener('resize', adjustSizes);
adjustSizes();  // Call this when the game starts

// Insert this at the very end of your .js file
window.onload = () => {
    // Call showStartScreen when the page loads
    showStartScreen();
    
    // If it's not a mobile device, hide the start button right away
    if (!isMobile()) {
        startButton.style.display = 'none';  // Hide start button on desktop
    }
};


