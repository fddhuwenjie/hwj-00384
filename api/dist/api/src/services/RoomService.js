import { generateRoomCode } from '../utils/generateRoomCode.js';
import { generateAvatar } from '../utils/generateAvatar.js';
const rooms = new Map();
const cleanExpiredRooms = () => {
    const now = Date.now();
    const EXPIRE_TIME = 24 * 60 * 60 * 1000;
    for (const [code, room] of rooms.entries()) {
        if (room.status === 'finished') {
            const createdAt = new Date(room.createdAt).getTime();
            if (now - createdAt > EXPIRE_TIME) {
                rooms.delete(code);
            }
        }
    }
};
setInterval(cleanExpiredRooms, 60 * 60 * 1000);
export const RoomService = {
    rooms,
    createRoom(ownerId, ownerNickname, settings) {
        let code;
        do {
            code = generateRoomCode(6);
        } while (rooms.has(code));
        const owner = {
            id: ownerId,
            nickname: ownerNickname,
            avatar: generateAvatar(ownerId),
            score: 0,
            streak: 0,
            isReady: false,
            isOnline: true,
        };
        const room = {
            code,
            ownerId,
            players: [owner],
            settings,
            status: 'waiting',
            createdAt: new Date().toISOString(),
            hasPassword: !!settings.password,
        };
        rooms.set(code, room);
        return room;
    },
    getRoom(code) {
        return rooms.get(code);
    },
    getRooms() {
        return Array.from(rooms.values()).filter(room => room.status !== 'playing');
    },
    getPublicRooms() {
        return Array.from(rooms.values()).filter(room => room.status === 'waiting' && !room.hasPassword);
    },
    joinRoom(code, playerId, nickname, password) {
        const room = rooms.get(code);
        if (!room) {
            return { error: '房间不存在' };
        }
        if (room.status === 'playing') {
            return { error: '游戏已开始，无法加入' };
        }
        if (room.status === 'finished') {
            return { error: '游戏已结束' };
        }
        if (room.hasPassword && room.settings.password !== password) {
            return { error: '密码错误' };
        }
        if (room.players.length >= room.settings.maxPlayers) {
            return { error: '房间已满' };
        }
        if (room.players.some(p => p.id === playerId)) {
            const existingPlayer = room.players.find(p => p.id === playerId);
            existingPlayer.isOnline = true;
            return room;
        }
        const player = {
            id: playerId,
            nickname,
            avatar: generateAvatar(playerId),
            score: 0,
            streak: 0,
            isReady: false,
            isOnline: true,
        };
        room.players.push(player);
        return room;
    },
    leaveRoom(code, playerId) {
        const room = rooms.get(code);
        if (!room) {
            return { error: '房间不存在' };
        }
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return { error: '玩家不在房间内' };
        }
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
            rooms.delete(code);
            return room;
        }
        if (room.ownerId === playerId) {
            room.ownerId = room.players[0].id;
        }
        return room;
    },
    kickPlayer(code, ownerId, playerId) {
        const room = rooms.get(code);
        if (!room) {
            return { error: '房间不存在' };
        }
        if (room.ownerId !== ownerId) {
            return { error: '无权限' };
        }
        if (room.ownerId === playerId) {
            return { error: '不能踢出房主' };
        }
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return { error: '玩家不在房间内' };
        }
        room.players.splice(playerIndex, 1);
        return room;
    },
    updateSettings(code, ownerId, settings) {
        const room = rooms.get(code);
        if (!room) {
            return { error: '房间不存在' };
        }
        if (room.ownerId !== ownerId) {
            return { error: '无权限' };
        }
        if (room.status !== 'waiting') {
            return { error: '游戏已开始，无法修改设置' };
        }
        room.settings = { ...room.settings, ...settings };
        room.hasPassword = !!room.settings.password;
        return room;
    },
    startGame(code, ownerId) {
        const room = rooms.get(code);
        if (!room) {
            return { error: '房间不存在' };
        }
        if (room.ownerId !== ownerId) {
            return { error: '无权限' };
        }
        if (room.status !== 'waiting') {
            return { error: '房间状态不正确' };
        }
        if (room.players.length < 2) {
            return { error: '至少需要2名玩家才能开始游戏' };
        }
        room.status = 'playing';
        room.players.forEach(p => {
            p.score = 0;
            p.streak = 0;
            p.isReady = false;
        });
        return room;
    },
    finishGame(code) {
        const room = rooms.get(code);
        if (!room) {
            return { error: '房间不存在' };
        }
        if (room.status !== 'playing') {
            return { error: '房间状态不正确' };
        }
        room.status = 'finished';
        return room;
    },
};
export default RoomService;
