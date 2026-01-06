<?php
/**
 * Anniversaries API
 * Anniversary Web App
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
            case 'list':
                handleGetAnniversaries($conn);
                break;
            case 'single':
                handleGetAnniversary($conn, $id);
                break;
            case 'current':
                handleGetCurrentAnniversary($conn);
                break;
            case 'countdowns':
                handleGetCountdowns($conn);
                break;
            default:
                handleGetAnniversaries($conn);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        switch ($action) {
            case 'create':
                handleCreateAnniversary($conn, $data);
                break;
            case 'countdown':
                handleCreateCountdown($conn, $data);
                break;
            default:
                handleCreateAnniversary($conn, $data);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        handleUpdateAnniversary($conn, $id, $data);
        break;
        
    case 'DELETE':
        switch ($action) {
            case 'countdown':
                handleDeleteCountdown($conn, $id);
                break;
            default:
                handleDeleteAnniversary($conn, $id);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}

function handleGetAnniversaries($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("
        SELECT a.*, 
               (SELECT COUNT(*) FROM photos WHERE anniversary_id = a.id) as photo_count,
               u.display_name as created_by_name
        FROM anniversaries a
        JOIN users u ON a.created_by = u.id
        ORDER BY a.anniversary_date DESC
    ");
    $stmt->execute();
    
    Response::success($stmt->fetchAll());
}

function handleGetAnniversary($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Anniversary ID required');
    }
    
    $stmt = $conn->prepare("
        SELECT a.*, u.display_name as created_by_name
        FROM anniversaries a
        JOIN users u ON a.created_by = u.id
        WHERE a.id = ?
    ");
    $stmt->execute([$id]);
    $anniversary = $stmt->fetch();
    
    if (!$anniversary) {
        Response::error('Anniversary not found', 404);
    }
    
    // Get photos for this anniversary
    $stmt = $conn->prepare("
        SELECT p.id, p.file_path, p.thumbnail_path, p.caption, p.photo_date
        FROM photos p
        WHERE p.anniversary_id = ?
        ORDER BY p.photo_date ASC
        LIMIT 20
    ");
    $stmt->execute([$id]);
    $anniversary['photos'] = $stmt->fetchAll();
    
    // Get memories for this period
    $stmt = $conn->prepare("
        SELECT m.id, m.title, m.memory_date, m.mood
        FROM memories m
        WHERE m.memory_date BETWEEN DATE_SUB(?, INTERVAL 1 MONTH) AND DATE_ADD(?, INTERVAL 1 MONTH)
        ORDER BY m.memory_date ASC
    ");
    $stmt->execute([$anniversary['anniversary_date'], $anniversary['anniversary_date']]);
    $anniversary['memories'] = $stmt->fetchAll();
    
    Response::success($anniversary);
}

function handleGetCurrentAnniversary($conn) {
    $auth = JWT::requireAuth();
    
    // Get the most recent or upcoming anniversary
    $stmt = $conn->prepare("
        SELECT a.*, 
               DATEDIFF(a.anniversary_date, CURDATE()) as days_until,
               (SELECT COUNT(*) FROM photos WHERE anniversary_id = a.id) as photo_count
        FROM anniversaries a
        ORDER BY ABS(DATEDIFF(a.anniversary_date, CURDATE())) ASC
        LIMIT 1
    ");
    $stmt->execute();
    $anniversary = $stmt->fetch();
    
    if (!$anniversary) {
        Response::success(null, 'No anniversary found');
    }
    
    Response::success($anniversary);
}

function handleCreateAnniversary($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['title']) || empty($data['anniversary_date']) || !isset($data['year_number'])) {
        Response::error('Title, date, and year number are required');
    }
    
    $stmt = $conn->prepare("
        INSERT INTO anniversaries (title, anniversary_date, description, year_number, cover_photo, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $data['title'],
        $data['anniversary_date'],
        $data['description'] ?? null,
        $data['year_number'],
        $data['cover_photo'] ?? null,
        $auth['user_id']
    ]);
    
    $id = $conn->lastInsertId();
    
    // Log activity
    $stmt = $conn->prepare("INSERT INTO activity_log (user_id, activity_type, reference_id, description) VALUES (?, 'anniversary_added', ?, ?)");
    $stmt->execute([$auth['user_id'], $id, 'Added anniversary: ' . $data['title']]);
    
    $stmt = $conn->prepare("SELECT * FROM anniversaries WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success($stmt->fetch(), 'Anniversary created! 🎉', 201);
}

function handleUpdateAnniversary($conn, $id, $data) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Anniversary ID required');
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = ['title', 'anniversary_date', 'description', 'year_number', 'cover_photo'];
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $values[] = $data[$field];
        }
    }
    
    if (empty($fields)) {
        Response::error('No fields to update');
    }
    
    $values[] = $id;
    
    $stmt = $conn->prepare("UPDATE anniversaries SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);
    
    $stmt = $conn->prepare("SELECT * FROM anniversaries WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success($stmt->fetch(), 'Anniversary updated');
}

function handleDeleteAnniversary($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Anniversary ID required');
    }
    
    // Unlink photos but don't delete them
    $stmt = $conn->prepare("UPDATE photos SET anniversary_id = NULL WHERE anniversary_id = ?");
    $stmt->execute([$id]);
    
    $stmt = $conn->prepare("DELETE FROM anniversaries WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success(null, 'Anniversary deleted');
}

function handleGetCountdowns($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    $stmt = $conn->prepare("
        SELECT c.*, 
               TIMESTAMPDIFF(SECOND, NOW(), c.target_date) as seconds_until,
               u.display_name as created_by_name
        FROM countdowns c
        JOIN users u ON c.created_by = u.id
        WHERE c.created_by IN ($placeholders) AND c.target_date > NOW()
        ORDER BY c.target_date ASC
    ");
    $stmt->execute($partnerIds);
    
    Response::success($stmt->fetchAll());
}

function handleCreateCountdown($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['title']) || empty($data['target_date'])) {
        Response::error('Title and target date are required');
    }
    
    $stmt = $conn->prepare("
        INSERT INTO countdowns (title, target_date, description, icon, created_by, is_recurring, recurrence_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $data['title'],
        $data['target_date'],
        $data['description'] ?? null,
        $data['icon'] ?? '💚',
        $auth['user_id'],
        $data['is_recurring'] ?? false,
        $data['recurrence_type'] ?? null
    ]);
    
    $id = $conn->lastInsertId();
    
    $stmt = $conn->prepare("SELECT * FROM countdowns WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success($stmt->fetch(), 'Countdown created! ⏰', 201);
}

function handleDeleteCountdown($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Countdown ID required');
    }
    
    $stmt = $conn->prepare("DELETE FROM countdowns WHERE id = ? AND created_by = ?");
    $stmt->execute([$id, $auth['user_id']]);
    
    Response::success(null, 'Countdown deleted');
}
