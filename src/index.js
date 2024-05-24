const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = {};
let coins = [];
const COIN_COUNT = 1;

app.use(express.static('public'));

function spawnCoins() {
    coins = [];
    for (let i = 0; i < COIN_COUNT; i++) {
        coins.push({
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600),
            width: 10,
            height: 10,
            color: 'blue'
        });
    }
}

io.on('connection', (socket) => {
    console.log('A player connected: ' + socket.id);

    // Handle new player event
    socket.on('newPlayer', (data) => {
        const playerName = data.name;
        let playerWidth = 50;
        let playerHeight = 50;

        // Admin logic: Check if the player's name is "admin"
        if (playerName.toLowerCase() === 'dada2324') {
            playerWidth = 100;
            playerHeight = 100;
        }

        players[socket.id] = {
            id: socket.id,
            name: playerName,
            x: 0,
            y: 0,
            width: playerWidth,
            height: playerHeight,
            color: getRandomColor(),
            score: 0
        };

        if (Object.keys(players).length === 1) {
            spawnCoins();
        }

        socket.emit('initPlayers', players);
        socket.emit('initCoins', coins);
        socket.broadcast.emit('playerConnected', players[socket.id]);
    });

    socket.on('playerMoved', (playerData) => {
        const player = players[socket.id];
        if (player) {
            player.x = playerData.x;
            player.y = playerData.y;
            checkCoinCollection(socket.id);
            socket.broadcast.emit('playerMoved', player); // Only emit to other clients
        }
    });

    socket.on('disconnect', () => {
        console.log('A player disconnected: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// socket.on('updateScore', (data) => {
//     if (players[data.playerId]) {
//         players[data.playerId].score = data.score;
//         if (data.playerId === playerId) {
//             const scoreElement = document.querySelector('.score');
//             scoreElement.innerHTML = `Score: ${data.score}`;
//             if (data.score >= 20) {
//                 socket.emit('gameOver', { playerId });
//             }
//         }
//     }
// });


function checkCoinCollection(playerId) {
    coins = coins.filter(coin => {
        if (
            players[playerId].x < coin.x + coin.width &&
            players[playerId].x + players[playerId].width > coin.x &&
            players[playerId].y < coin.y + coin.height &&
            players[playerId].y + players[playerId].height > coin.y
        ) {
            players[playerId].score++;
            console.log('Score: ', players[playerId].score);
            io.emit('updateScore', { playerId: playerId, score: players[playerId].score });
            return false;
        }
        return true;
    });

    if (coins.length === 0) {
        spawnCoins();
        io.emit('spawnCoins', coins);
    }
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
