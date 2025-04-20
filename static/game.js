const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const joinBtn = document.getElementById('joinBtn');
const waitingDiv = document.getElementById('waiting');
const scoreBoard = document.getElementById('scoreBoard');
const highscoresDiv = document.getElementById('highscores');
const usernameInput = document.getElementById('usernameInput');
const systemMsg = document.getElementById('systemMsg');

let socket = io();
let room = null;
let username = '';
let playerIdx = null;
let gameState = null;
let gameOver = false;

function drawGame(state) {
    ctx.clearRect(0, 0, 800, 600);
    // רקע
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);
    // קו אמצע
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 600);
    ctx.stroke();
    ctx.setLineDash([]);
    // לוחות
    ctx.fillStyle = '#fff';
    ctx.fillRect(30, state.paddles[0], 15, 100);
    ctx.fillRect(755, state.paddles[1], 15, 100);
    // כדור
    ctx.beginPath();
    ctx.arc(state.ball[0], state.ball[1], 10, 0, 2*Math.PI);
    ctx.fill();
    // ניקוד
    scoreBoard.innerText = state.score[0] + ' : ' + state.score[1];
}

joinBtn.onclick = () => {
    username = usernameInput.value.trim() || ('שחקן' + Math.floor(Math.random()*1000));
    socket.emit('join', {username});
    joinBtn.disabled = true;
    usernameInput.disabled = true;
};

socket.on('room_joined', (data) => {
    room = data.room;
    playerIdx = data.players.indexOf(username);
    if (data.players.length === 1) {
        waitingDiv.style.display = 'block';
    } else {
        waitingDiv.style.display = 'none';
    }
});

socket.on('waiting_for_player', () => {
    waitingDiv.style.display = 'block';
});

socket.on('system_message', (data) => {
    systemMsg.innerText = data.msg;
    setTimeout(()=>{systemMsg.innerText='';}, 5000);
});

socket.on('game_start', (data) => {
    gameState = data.game;
    waitingDiv.style.display = 'none';
    gameOver = false;
    requestAnimationFrame(gameLoop);
});

socket.on('update', (data) => {
    gameState = data.game;
    // בדוק אם מישהו ניצח (למשל 5 נקודות)
    if (!gameOver && (gameState.score[0] >= 5 || gameState.score[1] >= 5)) {
        gameOver = true;
        let winMsg = (gameState.score[0] >= 5 && playerIdx === 0) || (gameState.score[1] >= 5 && playerIdx === 1) ? 'ניצחת!' : 'הפסדת!';
        systemMsg.innerText = winMsg;
        socket.emit('save_score', {username, score: Math.max(...gameState.score)});
        setTimeout(()=>{window.location.reload();}, 3500);
    }
});

function gameLoop() {
    if (!gameState) return;
    drawGame(gameState);
    // שלח tick לשרת
    if (room !== null) {
        socket.emit('tick', {room});
    }
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (room === null || playerIdx === null) return;
    if (playerIdx === 0 && (e.key === 'w' || e.key === 's')) {
        socket.emit('move_paddle', {room, player: username, direction: e.key === 'w' ? 'up' : 'down'});
    }
    if (playerIdx === 1 && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        socket.emit('move_paddle', {room, player: username, direction: e.key === 'ArrowUp' ? 'up' : 'down'});
    }
});

function fetchHighscores() {
    fetch('/highscores').then(r => r.json()).then(data => {
        highscoresDiv.innerHTML = data.map((row, i) => `<div>${i+1}. ${row.username}: ${row.score}</div>`).join('');
    });
}

fetchHighscores();
setInterval(fetchHighscores, 10000);
