const WebSocket = require('ws');
const http = require('http');

// Use port from environment variable (like Render/Heroku) or 8080
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('StreamVault SharePlay Server is running!\n');
});

const wss = new WebSocket.Server({ server });

// Store sessions (rooms)
// Map<sessionId, Set<WebSocket>>
const sessions = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');

    let currentSessionId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data.type, 'from:', data.senderId);

            // Handle session joining
            if (data.type === 'join' && data.sessionId) {
                currentSessionId = data.sessionId;

                if (!sessions.has(currentSessionId)) {
                    sessions.set(currentSessionId, new Set());
                }
                sessions.get(currentSessionId).add(ws);

                console.log(`Client joined session: ${currentSessionId}`);
            }

            // Relay message to everyone else in the session
            if (currentSessionId && sessions.has(currentSessionId)) {
                const clients = sessions.get(currentSessionId);
                clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString());
                    }
                });
            }
        } catch (err) {
            console.error('Error processing message:', err);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (currentSessionId && sessions.has(currentSessionId)) {
            sessions.get(currentSessionId).delete(ws);
            if (sessions.get(currentSessionId).size === 0) {
                sessions.delete(currentSessionId);
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
