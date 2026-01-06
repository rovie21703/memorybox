<?php
/**
 * Memories API
 * Anniversary Web App - Remember the beautiful moments 💚💙
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
                handleGetMemories($conn);
                break;
            case 'single':
                handleGetMemory($conn, $id);
                break;
            case 'on-this-day':
                handleOnThisDay($conn);
                break;
            case 'milestones':
                handleGetMilestones($conn);
                break;
            case 'timeline':
                handleMemoriesTimeline($conn);
                break;
            default:
                handleGetMemories($conn);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        switch ($action) {
            case 'create':
                handleCreateMemory($conn, $data);
                break;
            case 'milestone':
                handleCreateMilestone($conn, $data);
                break;
            default:
                handleCreateMemory($conn, $data);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        handleUpdateMemory($conn, $id, $data);
        break;
        
    case 'DELETE':
        handleDeleteMemory($conn, $id);
        break;
        
    default:
        Response::error('Method not allowed', 405);
}

function handleGetMemories($conn) {
    $auth = JWT::requireAuth();
    
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    // Get total
    $countStmt = $conn->prepare("SELECT COUNT(*) as total FROM memories WHERE user_id IN ($placeholders)");
    $countStmt->execute($partnerIds);
    $total = $countStmt->fetch()['total'];
    
    // Get memories with photos
    $stmt = $conn->prepare("
        SELECT m.*, u.display_name as creator_name, u.avatar as creator_avatar,
        (SELECT GROUP_CONCAT(p.thumbnail_path) FROM memory_photos mp 
         JOIN photos p ON mp.photo_id = p.id WHERE mp.memory_id = m.id LIMIT 4) as photo_thumbnails
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.user_id IN ($placeholders)
        ORDER BY m.memory_date DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($partnerIds);
    $memories = $stmt->fetchAll();
    
    // Process photo thumbnails
    foreach ($memories as &$memory) {
        $memory['photos'] = $memory['photo_thumbnails'] ? explode(',', $memory['photo_thumbnails']) : [];
        unset($memory['photo_thumbnails']);
    }
    
    Response::paginate($memories, $total, $page, $limit);
}

function handleGetMemory($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Memory ID required');
    }
    
    $stmt = $conn->prepare("
        SELECT m.*, u.display_name as creator_name, u.avatar as creator_avatar
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
    ");
    $stmt->execute([$id]);
    $memory = $stmt->fetch();
    
    if (!$memory) {
        Response::error('Memory not found', 404);
    }
    
    // Get photos
    $stmt = $conn->prepare("
        SELECT p.id, p.file_path, p.thumbnail_path, p.caption
        FROM memory_photos mp
        JOIN photos p ON mp.photo_id = p.id
        WHERE mp.memory_id = ?
    ");
    $stmt->execute([$id]);
    $memory['photos'] = $stmt->fetchAll();
    
    Response::success($memory);
}

function handleOnThisDay($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    $today = date('m-d');
    
    // Get photos from this day in previous years
    $stmt = $conn->prepare("
        SELECT p.*, YEAR(p.photo_date) as photo_year, u.display_name as uploader_name
        FROM photos p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id IN ($placeholders) 
        AND DATE_FORMAT(p.photo_date, '%m-%d') = ?
        AND YEAR(p.photo_date) < YEAR(CURDATE())
        ORDER BY p.photo_date DESC
    ");
    $stmt->execute(array_merge($partnerIds, [$today]));
    $photos = $stmt->fetchAll();
    
    // Get memories from this day in previous years
    $stmt = $conn->prepare("
        SELECT m.*, YEAR(m.memory_date) as memory_year, u.display_name as creator_name
        FROM memories m
        JOIN users u ON m.user_id = u.id
        WHERE m.user_id IN ($placeholders) 
        AND DATE_FORMAT(m.memory_date, '%m-%d') = ?
        AND YEAR(m.memory_date) < YEAR(CURDATE())
        ORDER BY m.memory_date DESC
    ");
    $stmt->execute(array_merge($partnerIds, [$today]));
    $memories = $stmt->fetchAll();
    
    // Group by years ago
    $result = [];
    foreach ($photos as $photo) {
        $yearsAgo = date('Y') - $photo['photo_year'];
        if (!isset($result[$yearsAgo])) {
            $result[$yearsAgo] = ['years_ago' => $yearsAgo, 'photos' => [], 'memories' => []];
        }
        $result[$yearsAgo]['photos'][] = $photo;
    }
    
    foreach ($memories as $memory) {
        $yearsAgo = date('Y') - $memory['memory_year'];
        if (!isset($result[$yearsAgo])) {
            $result[$yearsAgo] = ['years_ago' => $yearsAgo, 'photos' => [], 'memories' => []];
        }
        $result[$yearsAgo]['memories'][] = $memory;
    }
    
    ksort($result);
    
    Response::success(array_values($result));
}

function handleCreateMemory($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['title']) || empty($data['memory_date'])) {
        Response::error('Title and date are required');
    }
    
    $stmt = $conn->prepare("
        INSERT INTO memories (user_id, title, description, memory_date, mood, is_milestone)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $auth['user_id'],
        $data['title'],
        $data['description'] ?? null,
        $data['memory_date'],
        $data['mood'] ?? 'happy',
        $data['is_milestone'] ?? false
    ]);
    
    $memoryId = $conn->lastInsertId();
    
    // Link photos if provided
    if (!empty($data['photo_ids'])) {
        $stmt = $conn->prepare("INSERT INTO memory_photos (memory_id, photo_id) VALUES (?, ?)");
        foreach ($data['photo_ids'] as $photoId) {
            $stmt->execute([$memoryId, $photoId]);
        }
    }
    
    // Log activity
    $stmt = $conn->prepare("INSERT INTO activity_log (user_id, activity_type, reference_id, description) VALUES (?, 'memory_added', ?, ?)");
    $stmt->execute([$auth['user_id'], $memoryId, 'Added a new memory: ' . $data['title']]);
    
    // Get created memory
    $stmt = $conn->prepare("SELECT * FROM memories WHERE id = ?");
    $stmt->execute([$memoryId]);
    
    Response::success($stmt->fetch(), 'Memory created! 💭', 201);
}

function handleUpdateMemory($conn, $id, $data) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Memory ID required');
    }
    
    // Verify ownership
    $stmt = $conn->prepare("SELECT user_id FROM memories WHERE id = ?");
    $stmt->execute([$id]);
    $memory = $stmt->fetch();
    
    if (!$memory || $memory['user_id'] != $auth['user_id']) {
        Response::error('Memory not found or unauthorized', 403);
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = ['title', 'description', 'memory_date', 'mood', 'is_milestone'];
    
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
    
    $stmt = $conn->prepare("UPDATE memories SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);
    
    // Update photo links if provided
    if (isset($data['photo_ids'])) {
        $stmt = $conn->prepare("DELETE FROM memory_photos WHERE memory_id = ?");
        $stmt->execute([$id]);
        
        $stmt = $conn->prepare("INSERT INTO memory_photos (memory_id, photo_id) VALUES (?, ?)");
        foreach ($data['photo_ids'] as $photoId) {
            $stmt->execute([$id, $photoId]);
        }
    }
    
    $stmt = $conn->prepare("SELECT * FROM memories WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success($stmt->fetch(), 'Memory updated');
}

function handleDeleteMemory($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Memory ID required');
    }
    
    $stmt = $conn->prepare("SELECT user_id FROM memories WHERE id = ?");
    $stmt->execute([$id]);
    $memory = $stmt->fetch();
    
    if (!$memory || $memory['user_id'] != $auth['user_id']) {
        Response::error('Memory not found or unauthorized', 403);
    }
    
    $stmt = $conn->prepare("DELETE FROM memories WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success(null, 'Memory deleted');
}

function handleGetMilestones($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    $stmt = $conn->prepare("
        SELECT * FROM milestones
        WHERE created_by IN ($placeholders)
        ORDER BY milestone_date DESC
    ");
    $stmt->execute($partnerIds);
    
    Response::success($stmt->fetchAll());
}

function handleCreateMilestone($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['title']) || empty($data['milestone_date'])) {
        Response::error('Title and date are required');
    }
    
    $stmt = $conn->prepare("
        INSERT INTO milestones (title, description, milestone_date, icon, category, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $data['title'],
        $data['description'] ?? null,
        $data['milestone_date'],
        $data['icon'] ?? '💚',
        $data['category'] ?? 'other',
        $auth['user_id']
    ]);
    
    $id = $conn->lastInsertId();
    
    $stmt = $conn->prepare("SELECT * FROM milestones WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success($stmt->fetch(), 'Milestone created! 🎉', 201);
}

function handleMemoriesTimeline($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    // Get all activities in chronological order
    $stmt = $conn->prepare("
        (SELECT 'memory' as type, m.id, m.title, m.description, m.memory_date as date, m.mood, NULL as file_path
         FROM memories m WHERE m.user_id IN ($placeholders))
        UNION ALL
        (SELECT 'milestone' as type, ml.id, ml.title, ml.description, ml.milestone_date as date, ml.category as mood, ml.icon as file_path
         FROM milestones ml WHERE ml.created_by IN ($placeholders))
        UNION ALL
        (SELECT 'anniversary' as type, a.id, a.title, a.description, a.anniversary_date as date, CONCAT('Year ', a.year_number) as mood, a.cover_photo as file_path
         FROM anniversaries a WHERE a.created_by IN ($placeholders))
        ORDER BY date DESC
    ");
    
    $stmt->execute(array_merge($partnerIds, $partnerIds, $partnerIds));
    
    Response::success($stmt->fetchAll());
}
