const { EventEmitter } = require('events');

class GameSession extends EventEmitter {
    constructor() {
        super();
        this.maxPlayers = 2;
        this.timeLimitSec = 120;
        this.reset();
    }

    reset() {
        this.board = Array.from({ length: 4 }, () => Array(4).fill(null));
        this.clients = new Map();  // clientId → color
        this.gameTime = 0;
        this.started = false;
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    addClient(clientId) {
        // if (this.clients.get(clientId)) return this.clients.get(clientId).color;
        if (this.clients.size >= this.maxPlayers) return false;
        
        const assignedColor = this.asignNextColor();

        this.clients.set(clientId, assignedColor);
        this.emit('playerJoined', { clientId, color: assignedColor });

        if (this.clients.size === this.maxPlayers) this.startTimer();

        return assignedColor;
    }

    asignNextColor() {
        return this.clients.size === 0 ? 'blue' : 'red';
    }

    startTimer() {
        if (this.interval) return;
        this.started = true;
        const startTime = Date.now();

        this.interval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const isoTime = new Date(elapsedTime).toISOString().slice(15, 19);
        
            this.emit('timeUpdate', isoTime);

            if (elapsedTime / 1000 > this.timeLimitSec) {
                this.end('Time limit reached');
            }
        
        }, 1000);
    }

    end(reason) {
        clearInterval(this.interval);
        this.emit('gameOver', {reason, board: this.board});
        this.reset();
    }

    checkWin() {
        let blueScore = 0, redScore = 0;
        const flatBoard = this.board.flatMap(row => row);

        flatBoard.forEach(cell => {
            if (cell === "blue") {
                blueScore++;
            } else if (cell === "red") {
                redScore++;
            }
        })
        const scoreRequiredToWin = flatBoard.length / 2;
        const hasWinningScore = [blueScore, redScore].some((score) => score > scoreRequiredToWin);
        
        return hasWinningScore;
    }

    play(row, col, assignedColor) {
        if (!this.started) return false;
        
        const isCellOutOfBounds = row < 0 || row > 3 || col < 0 || col > 3;
        const isCellOccupied = this.board[row][col] !== null;

        if (isCellOutOfBounds || isCellOccupied) return false;

        this.board[row][col] = assignedColor;
        this.emit('boardUpdate', this.board);

        const isWinningMove = this.checkWin();

        if (isWinningMove) {
            this.end(`${assignedColor} wins!`);

        } else if (this.board.flat().every(cell => cell !== null)) {
            this.end('Draw');
        }

        return this.board;
    }
}

module.exports = GameSession;