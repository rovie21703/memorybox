<?php
/**
 * Messages API
 * Anniversary Web App - Love Messages 💚💙
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? null;

try {
    $db = new Database();
    $conn = $db->getConnection();
} catch (Exception $e) {
    Response::error("Database connection failed: " . $e->getMessage(), 500);
}

switch ($method) {
    case 'GET':
        switch ($action) {
            case 'conversation':
                handleGetConversation($conn);
                break;
            case 'unread':
                handleGetUnread($conn);
                break;
            case 'love-notes':
                handleGetLoveNotes($conn);
                break;
            case 'love-note':
                handleGetLoveNote($conn, $id);
                break;
            default:
                handleGetConversation($conn);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        switch ($action) {
            case 'send':
                handleSendMessage($conn, $data);
                break;
            case 'love-note':
                handleSendLoveNote($conn, $data);
                break;
            case 'heart':
                handleSendHeart($conn);
                break;
            default:
                handleSendMessage($conn, $data);
        }
        break;
        
    case 'PUT':
        switch ($action) {
            case 'read':
                handleMarkAsRead($conn);
                break;
            case 'open-note':
                handleOpenLoveNote($conn, $id);
                break;
            default:
                Response::error('Invalid action', 400);
        }
        break;
        
    case 'DELETE':
        handleDeleteMessage($conn, $id);
        break;
        
    default:
        Response::error('Method not allowed', 405);
}

function handleGetConversation($conn) {
    $auth = JWT::requireAuth();
    
    // Get partner
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user['partner_id']) {
        Response::success([], 'No partner linked yet');
    }
    
    $partnerId = $user['partner_id'];
    
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    
    // Get messages between the couple
    $stmt = $conn->prepare("
        SELECT m.*, 
               sender.display_name as sender_name, sender.avatar as sender_avatar,
               receiver.display_name as receiver_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ? AND m.is_deleted_by_sender = 0)
           OR (m.sender_id = ? AND m.receiver_id = ? AND m.is_deleted_by_receiver = 0))
        ORDER BY m.created_at DESC
        LIMIT $limit OFFSET $offset
    ");
    
    $stmt->execute([$auth['user_id'], $partnerId, $partnerId, $auth['user_id']]);
    $messages = $stmt->fetchAll();
    
    // Mark received messages as read
    $stmt = $conn->prepare("UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0");
    $stmt->execute([$auth['user_id'], $partnerId]);
    
    // Reverse for chronological display
    $messages = array_reverse($messages);
    
    Response::success($messages);
}

function handleSendMessage($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['content']) && empty($data['message_type'])) {
        Response::error('Message content is required');
    }
    
    // Get partner
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user['partner_id']) {
        Response::error('No partner linked yet');
    }
    
    $stmt = $conn->prepare("
        INSERT INTO messages (sender_id, receiver_id, content, message_type, attachment_path)
        VALUES (?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $auth['user_id'],
        $user['partner_id'],
        $data['content'] ?? '',
        $data['message_type'] ?? 'text',
        $data['attachment_path'] ?? null
    ]);
    
    $messageId = $conn->lastInsertId();
    
    // Log activity
    $stmt = $conn->prepare("INSERT INTO activity_log (user_id, activity_type, reference_id, description) VALUES (?, 'message_sent', ?, 'Sent a message')");
    $stmt->execute([$auth['user_id'], $messageId]);
    
    // Get created message
    $stmt = $conn->prepare("
        SELECT m.*, u.display_name as sender_name, u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
    ");
    $stmt->execute([$messageId]);
    
    Response::success($stmt->fetch(), 'Message sent 💌', 201);
}

function handleSendHeart($conn) {
    $auth = JWT::requireAuth();
    
    // Get partner
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user['partner_id']) {
        Response::error('No partner linked yet');
    }
    
    $stmt = $conn->prepare("
        INSERT INTO messages (sender_id, receiver_id, content, message_type)
        VALUES (?, ?, '💚', 'heart')
    ");
    
    $stmt->execute([$auth['user_id'], $user['partner_id']]);
    
    Response::success(null, 'Heart sent! 💚');
}

function handleGetUnread($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0");
    $stmt->execute([$auth['user_id']]);
    $messages = $stmt->fetch()['count'];
    
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM love_notes WHERE to_user_id = ? AND is_opened = 0 AND deliver_at <= NOW()");
    $stmt->execute([$auth['user_id']]);
    $loveNotes = $stmt->fetch()['count'];
    
    Response::success([
        'messages' => $messages,
        'love_notes' => $loveNotes,
        'total' => $messages + $loveNotes
    ]);
}

function handleMarkAsRead($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user['partner_id']) {
        Response::success(null);
    }
    
    $stmt = $conn->prepare("UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?");
    $stmt->execute([$auth['user_id'], $user['partner_id']]);
    
    Response::success(null, 'Messages marked as read');
}

function handleDeleteMessage($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Message ID required');
    }
    
    $stmt = $conn->prepare("SELECT sender_id, receiver_id FROM messages WHERE id = ?");
    $stmt->execute([$id]);
    $message = $stmt->fetch();
    
    if (!$message) {
        Response::error('Message not found', 404);
    }
    
    if ($message['sender_id'] == $auth['user_id']) {
        $stmt = $conn->prepare("UPDATE messages SET is_deleted_by_sender = 1 WHERE id = ?");
    } elseif ($message['receiver_id'] == $auth['user_id']) {
        $stmt = $conn->prepare("UPDATE messages SET is_deleted_by_receiver = 1 WHERE id = ?");
    } else {
        Response::error('Unauthorized', 403);
    }
    
    $stmt->execute([$id]);
    
    Response::success(null, 'Message deleted');
}

// Love Notes functions
function handleSendLoveNote($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['content'])) {
        Response::error('Love note content is required');
    }
    
    // Get partner
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user['partner_id']) {
        Response::error('No partner linked yet');
    }
    
    $deliverAt = $data['deliver_at'] ?? date('Y-m-d H:i:s');
    
    $stmt = $conn->prepare("
        INSERT INTO love_notes (from_user_id, to_user_id, content, note_type, background_color, deliver_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $auth['user_id'],
        $user['partner_id'],
        $data['content'],
        $data['note_type'] ?? 'random',
        $data['background_color'] ?? '#a7f3d0',
        $deliverAt
    ]);
    
    $noteId = $conn->lastInsertId();
    
    // Log activity
    $stmt = $conn->prepare("INSERT INTO activity_log (user_id, activity_type, reference_id, description) VALUES (?, 'love_note_sent', ?, 'Sent a love note')");
    $stmt->execute([$auth['user_id'], $noteId]);
    
    Response::success(['id' => $noteId], 'Love note created! 💌', 201);
}

function handleGetLoveNotes($conn) {
    $auth = JWT::requireAuth();
    
    // Get notes sent to user that are ready to be delivered
    $stmt = $conn->prepare("
        SELECT ln.*, u.display_name as from_name, u.avatar as from_avatar
        FROM love_notes ln
        JOIN users u ON ln.from_user_id = u.id
        WHERE ln.to_user_id = ? AND ln.deliver_at <= NOW()
        ORDER BY ln.created_at DESC
    ");
    $stmt->execute([$auth['user_id']]);
    $received = $stmt->fetchAll();
    
    // Get notes sent by user
    $stmt = $conn->prepare("
        SELECT ln.*, u.display_name as to_name
        FROM love_notes ln
        JOIN users u ON ln.to_user_id = u.id
        WHERE ln.from_user_id = ?
        ORDER BY ln.created_at DESC
    ");
    $stmt->execute([$auth['user_id']]);
    $sent = $stmt->fetchAll();
    
    Response::success([
        'received' => $received,
        'sent' => $sent
    ]);
}

function handleGetLoveNote($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Love note ID required');
    }
    
    $stmt = $conn->prepare("
        SELECT ln.*, u.display_name as from_name, u.avatar as from_avatar
        FROM love_notes ln
        JOIN users u ON ln.from_user_id = u.id
        WHERE ln.id = ? AND (ln.to_user_id = ? OR ln.from_user_id = ?)
    ");
    $stmt->execute([$id, $auth['user_id'], $auth['user_id']]);
    $note = $stmt->fetch();
    
    if (!$note) {
        Response::error('Love note not found', 404);
    }
    
    Response::success($note);
}

function handleOpenLoveNote($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Love note ID required');
    }
    
    $stmt = $conn->prepare("UPDATE love_notes SET is_opened = 1 WHERE id = ? AND to_user_id = ?");
    $stmt->execute([$id, $auth['user_id']]);
    
    // Get the opened note
    $stmt = $conn->prepare("
        SELECT ln.*, u.display_name as from_name, u.avatar as from_avatar
        FROM love_notes ln
        JOIN users u ON ln.from_user_id = u.id
        WHERE ln.id = ?
    ");
    $stmt->execute([$id]);
    
    Response::success($stmt->fetch(), 'Love note opened! 💚');
}
