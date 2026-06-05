import db from '../db/database.js';
export const FriendService = {
    searchPlayers(currentPlayerId, nickname, limit = 20) {
        const searchStmt = db.prepare(`
      SELECT 
        us.player_id,
        us.nickname,
        us.avatar,
        us.is_online,
        us.is_in_game,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_friend,
        CASE WHEN fr.id IS NOT NULL THEN 1 ELSE 0 END as has_pending_request
      FROM user_stats us
      LEFT JOIN friendships f ON 
        (f.player_id1 = ? AND f.player_id2 = us.player_id) OR 
        (f.player_id2 = ? AND f.player_id1 = us.player_id)
      LEFT JOIN friend_requests fr ON 
        ((fr.sender_id = ? AND fr.receiver_id = us.player_id) OR 
         (fr.receiver_id = ? AND fr.sender_id = us.player_id)) AND 
        fr.status = 'pending'
      WHERE us.player_id != ? 
        AND us.nickname LIKE ?
      ORDER BY us.is_online DESC, us.nickname ASC
      LIMIT ?
    `);
        const rows = searchStmt.all(currentPlayerId, currentPlayerId, currentPlayerId, currentPlayerId, currentPlayerId, `%${nickname}%`, limit);
        return rows.map((row) => ({
            playerId: row.player_id,
            nickname: row.nickname,
            avatar: row.avatar ?? undefined,
            isOnline: row.is_online === 1,
            isInGame: row.is_in_game === 1,
            isFriend: row.is_friend === 1,
            hasPendingRequest: row.has_pending_request === 1,
        }));
    },
    sendFriendRequest(senderId, receiverId) {
        if (senderId === receiverId) {
            throw new Error('Cannot send friend request to yourself');
        }
        const senderStmt = db.prepare('SELECT * FROM user_stats WHERE player_id = ?');
        const sender = senderStmt.get(senderId);
        if (!sender) {
            throw new Error('Sender not found');
        }
        const receiverStmt = db.prepare('SELECT * FROM user_stats WHERE player_id = ?');
        const receiver = receiverStmt.get(receiverId);
        if (!receiver) {
            throw new Error('Receiver not found');
        }
        const existingFriendshipStmt = db.prepare(`
      SELECT id FROM friendships 
      WHERE (player_id1 = ? AND player_id2 = ?) OR (player_id1 = ? AND player_id2 = ?)
    `);
        const existingFriendship = existingFriendshipStmt.get(senderId, receiverId, receiverId, senderId);
        if (existingFriendship) {
            throw new Error('You are already friends');
        }
        const existingRequestStmt = db.prepare(`
      SELECT id, status FROM friend_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY id DESC
      LIMIT 1
    `);
        const existingRequest = existingRequestStmt.get(senderId, receiverId, receiverId, senderId);
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                if (existingRequest.sender_id === senderId) {
                    throw new Error('Friend request already sent');
                }
                else {
                    throw new Error('You have a pending friend request from this user');
                }
            }
        }
        const now = new Date().toISOString();
        const insertStmt = db.prepare(`
      INSERT INTO friend_requests (sender_id, receiver_id, status, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, ?)
    `);
        const result = insertStmt.run(senderId, receiverId, now, now);
        return {
            id: result.lastInsertRowid,
            senderId,
            senderNickname: sender.nickname,
            senderAvatar: sender.avatar ?? undefined,
            receiverId,
            receiverNickname: receiver.nickname,
            receiverAvatar: receiver.avatar ?? undefined,
            status: 'pending',
            createdAt: now,
        };
    },
    getReceivedRequests(playerId) {
        const stmt = db.prepare(`
      SELECT 
        fr.id,
        fr.sender_id,
        fr.receiver_id,
        fr.status,
        fr.created_at,
        sender.nickname as sender_nickname,
        sender.avatar as sender_avatar,
        receiver.nickname as receiver_nickname,
        receiver.avatar as receiver_avatar
      FROM friend_requests fr
      INNER JOIN user_stats sender ON fr.sender_id = sender.player_id
      INNER JOIN user_stats receiver ON fr.receiver_id = receiver.player_id
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `);
        const rows = stmt.all(playerId);
        return rows.map((row) => ({
            id: row.id,
            senderId: row.sender_id,
            senderNickname: row.sender_nickname,
            senderAvatar: row.sender_avatar ?? undefined,
            receiverId: row.receiver_id,
            receiverNickname: row.receiver_nickname,
            receiverAvatar: row.receiver_avatar ?? undefined,
            status: row.status,
            createdAt: row.created_at,
        }));
    },
    acceptFriendRequest(requestId, playerId) {
        const requestStmt = db.prepare(`
      SELECT fr.*, sender.nickname as sender_nickname, sender.avatar as sender_avatar
      FROM friend_requests fr
      INNER JOIN user_stats sender ON fr.sender_id = sender.player_id
      WHERE fr.id = ? AND fr.receiver_id = ? AND fr.status = 'pending'
    `);
        const request = requestStmt.get(requestId, playerId);
        if (!request) {
            throw new Error('Friend request not found or already processed');
        }
        const now = new Date().toISOString();
        const updateStmt = db.prepare(`
      UPDATE friend_requests 
      SET status = 'accepted', updated_at = ?
      WHERE id = ?
    `);
        updateStmt.run(now, requestId);
        const insertStmt = db.prepare(`
      INSERT INTO friendships (player_id1, player_id2, created_at)
      VALUES (?, ?, ?)
    `);
        insertStmt.run(request.sender_id, request.receiver_id, now);
        const friendStmt = db.prepare(`
      SELECT 
        us.player_id,
        us.nickname,
        us.avatar,
        us.is_online,
        us.is_in_game
      FROM user_stats us
      WHERE us.player_id = ?
    `);
        const friend = friendStmt.get(request.sender_id);
        return {
            playerId: friend.player_id,
            nickname: friend.nickname,
            avatar: friend.avatar ?? undefined,
            isOnline: friend.is_online === 1,
            isInGame: friend.is_in_game === 1,
            addedAt: now,
        };
    },
    rejectFriendRequest(requestId, playerId) {
        const requestStmt = db.prepare(`
      SELECT id FROM friend_requests 
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `);
        const request = requestStmt.get(requestId, playerId);
        if (!request) {
            throw new Error('Friend request not found or already processed');
        }
        const now = new Date().toISOString();
        const updateStmt = db.prepare(`
      UPDATE friend_requests 
      SET status = 'rejected', updated_at = ?
      WHERE id = ?
    `);
        updateStmt.run(now, requestId);
    },
    getFriends(playerId, rooms) {
        const stmt = db.prepare(`
      SELECT 
        f.id as friendship_id,
        f.created_at,
        us.player_id,
        us.nickname,
        us.avatar,
        us.is_online,
        us.is_in_game
      FROM friendships f
      INNER JOIN user_stats us ON 
        (f.player_id1 = ? AND us.player_id = f.player_id2) OR
        (f.player_id2 = ? AND us.player_id = f.player_id1)
      ORDER BY us.is_online DESC, us.nickname ASC
    `);
        const rows = stmt.all(playerId, playerId);
        return rows.map((row) => {
            let roomCode;
            const roomsArray = Array.from(rooms.values());
            for (let i = 0; i < roomsArray.length; i++) {
                const room = roomsArray[i];
                if (room.players.some((p) => p.id === row.player_id)) {
                    roomCode = room.code;
                    break;
                }
            }
            return {
                playerId: row.player_id,
                nickname: row.nickname,
                avatar: row.avatar ?? undefined,
                isOnline: row.is_online === 1,
                isInGame: row.is_in_game === 1,
                roomCode,
                addedAt: row.created_at,
            };
        });
    },
    removeFriend(currentPlayerId, friendPlayerId) {
        const friendshipStmt = db.prepare(`
      SELECT id FROM friendships 
      WHERE (player_id1 = ? AND player_id2 = ?) OR (player_id1 = ? AND player_id2 = ?)
    `);
        const friendship = friendshipStmt.get(currentPlayerId, friendPlayerId, friendPlayerId, currentPlayerId);
        if (!friendship) {
            throw new Error('Friendship not found');
        }
        const deleteStmt = db.prepare('DELETE FROM friendships WHERE id = ?');
        deleteStmt.run(friendship.id);
    },
};
export default FriendService;
