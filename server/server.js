const WebSocket = require('ws');
const { v4: uuid } = require('uuid');
const GameSession = require('./game');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });
const session = new GameSession();
const connections = new Map();
const inactivityLimitTime = 10000; // 10 seconds
const pingCheckInterval = 1000; // 1 second

wss.on('connection', (ws, req) => {
  const clientId = uuid();
  console.log("New connection attempt");
  console.log("session.clients: ", session.clients.size);
  let color = session.addClient(clientId);
  if (!color) return ws.close(1000, 'Game is full');

  connections.set(clientId, {
    ws: ws,
    lastHeartbeatAt: Date.now()
  });

  const intervalId = setInterval(() => {
    console.log("checkingActivityFrom: ", clientId);

    const conn = connections.get(clientId);
    if (!conn) {
      clearInterval(intervalId);
      return;
    }
    
    if (Date.now() - conn.lastHeartbeatAt > inactivityLimitTime) {
      ws.close(1000, 'Inactive');
      session.end('player inactive');

      clearInterval(intervalId);
      connections.delete(clientId);
      console.log("closing connection for:", clientId);
    }
  }, pingCheckInterval);

  ws.on('close', () => clearInterval(intervalId));
  connections.get(clientId).activityChecker = intervalId

  ws.send(JSON.stringify({ type: 'assignColor', color }));
  ws.send(JSON.stringify({ type: 'updateBoard', board: session.board }));

  ws.on('message', raw => {
    let data;

    try { data = JSON.parse(raw) }
    catch { return ws.send(JSON.stringify({ type: 'error', message: 'Bad JSON' })); }

    if (data.type === 'ping') {
      const meta = connections.get(clientId);
      if (meta) meta.lastHeartbeatAt = Date.now();
      return
    }

    const ok = session.play(data.row, data.column, color);

    if (!ok) ws.send(JSON.stringify({ type: 'error', message: 'Invalid move' }));
  });

});

const broadcast = payload => {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(msg));
};

session.on('playerJoined', ({ clientId, color }) => broadcast({ type: 'playerJoined', clientId, color }));
session.on('boardUpdate', board => broadcast({ type: 'updateBoard', board }));
session.on('timeUpdate', t => broadcast({ type: 'gameTimeUpdate', gameTime: t }));
session.on('gameOver', ({ reason, board }) => {
  broadcast({ type: 'gameOver', reason, board });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1000, 'Game Over');
    }
  });
});
session.on('playerLeft', clientId => broadcast({ type: 'playerLeft', clientId }));
