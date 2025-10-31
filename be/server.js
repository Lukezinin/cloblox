// backend/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Chave secreta para JWT
const JWT_SECRET = 'cloblox_secret_key';

// Simulação de banco de dados local
let users = {}; // { userId: { username, passwordHash, favorites: [], history: [] } }

// ==================== AUTENTICAÇÃO ==================== //

// Registrar usuário Cloblox
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e senha são obrigatórios' });

    // Checar se já existe
    const exists = Object.values(users).find(u => u.username === username);
    if (exists) return res.status(400).json({ error: 'Usuário já existe' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = Date.now().toString(); // ID simples
    users[userId] = { username, passwordHash, favorites: [], history: [] };

    res.json({ success: true, userId });
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userEntry = Object.entries(users).find(([id, u]) => u.username === username);
    if (!userEntry) return res.status(400).json({ error: 'Usuário não encontrado' });

    const [userId, user] = userEntry;
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Senha incorreta' });

    // Gerar token JWT
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, userId, username });
});

// Middleware para rotas autenticadas
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido' });
    }
}

// Logout (simulado, apenas para frontend)
app.post('/logout', authMiddleware, (req, res) => {
    res.json({ success: true, message: 'Logout feito com sucesso' });
});

// ==================== ROTAS PRINCIPAIS ==================== //

// Buscar usuário Roblox pelo username (mantido do backend anterior)
app.get('/user/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const userResp = await axios.get(`https://api.roblox.com/users/get-by-username?username=${username}`);
        if (!userResp.data.Id) return res.status(404).json({ error: 'Usuário não encontrado' });

        const userId = userResp.data.Id;
        const userInfo = await axios.get(`https://users.roblox.com/v1/users/${userId}`);

        // Salvar no banco local se não existir
        if (!users[userId]) users[userId] = { username, favorites: [], history: [] };

        res.json({ userId, ...userInfo.data });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

// Listar jogos de um usuário
app.get('/games/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const gamesResp = await axios.get(`https://games.roblox.com/v2/users/${userId}/games?limit=10`);
        res.json(gamesResp.data);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erro ao buscar jogos' });
    }
});

// Favoritos (rotas autenticadas)
app.post('/favorite/:gameId', authMiddleware, (req, res) => {
    const { gameId } = req.params;
    const user = users[req.userId];
    if (!user.favorites.includes(gameId)) user.favorites.push(gameId);
    res.json({ success: true, favorites: user.favorites });
});

app.delete('/favorite/:gameId', authMiddleware, (req, res) => {
    const { gameId } = req.params;
    const user = users[req.userId];
    user.favorites = user.favorites.filter(id => id !== gameId);
    res.json({ success: true, favorites: user.favorites });
});

app.get('/favorites', authMiddleware, (req, res) => {
    const user = users[req.userId];
    res.json({ favorites: user.favorites });
});

// Histórico de jogos
app.get('/history', authMiddleware, (req, res) => {
    const user = users[req.userId];
    res.json({ history: user.history });
});

app.post('/play/:gameId', authMiddleware, (req, res) => {
    const { gameId } = req.params;
    const user = users[req.userId];
    user.history.push({ gameId, date: new Date() });
    res.json({ success: true, message: `Você começou a jogar o jogo ${gameId}` });
});

// Notificações simuladas
app.get('/notifications', authMiddleware, (req, res) => {
    const notifications = [
        { message: 'Você ganhou um novo item!', date: new Date() },
        { message: 'Seu amigo começou a jogar Cloblox!', date: new Date() }
    ];
    res.json({ notifications });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Cloblox Backend com login rodando em http://localhost:${PORT}`);
});
