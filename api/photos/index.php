<?php
/**
 * Photos API
 * Anniversary Web App
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/upload.php';

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
                handleGetPhotos($conn);
                break;
            case 'single':
                handleGetPhoto($conn, $id);
                break;
            case 'favorites':
                handleGetFavorites($conn);
                break;
            case 'by-date':
                handleGetPhotosByDate($conn);
                break;
            case 'by-anniversary':
                handleGetPhotosByAnniversary($conn);
                break;
            case 'timeline':
                handleGetTimeline($conn);
                break;
            case 'stats':
                handleGetStats($conn);
                break;
            default:
                handleGetPhotos($conn);
        }
        break;
        
    case 'POST':
        switch ($action) {
            case 'upload':
                handleUploadPhoto($conn);
                break;
            case 'reaction':
                handleAddReaction($conn);
                break;
            case 'comment':
                handleAddComment($conn);
                break;
            default:
                handleUploadPhoto($conn);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        switch ($action) {
            case 'update':
                handleUpdatePhoto($conn, $id, $data);
                break;
            case 'favorite':
                handleToggleFavorite($conn, $id);
                break;
            default:
                Response::error('Invalid action', 400);
        }
        break;
        
    case 'DELETE':
        handleDeletePhoto($conn, $id);
        break;
        
    default:
        Response::error('Method not allowed', 405);
}

function handleGetPhotos($conn) {
    $auth = JWT::requireAuth();
    
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    // Get photos from user and their partner
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    // Build query with filters
    $where = "WHERE p.user_id IN ($placeholders)";
    $params = $partnerIds;
    
    if (!empty($_GET['anniversary_id'])) {
        $where .= " AND p.anniversary_id = ?";
        $params[] = $_GET['anniversary_id'];
    }
    
    if (!empty($_GET['year'])) {
        $where .= " AND YEAR(p.photo_date) = ?";
        $params[] = $_GET['year'];
    }
    
    if (!empty($_GET['month'])) {
        $where .= " AND MONTH(p.photo_date) = ?";
        $params[] = $_GET['month'];
    }
    
    $orderBy = "ORDER BY p.photo_date DESC, p.created_at DESC";
    
    // Get total count
    $countStmt = $conn->prepare("SELECT COUNT(*) as total FROM photos p $where");
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];
    
    // Get photos with user info and reaction count
    $sql = "SELECT p.*, u.display_name as uploader_name, u.avatar as uploader_avatar,
            (SELECT COUNT(*) FROM photo_reactions pr WHERE pr.photo_id = p.id) as reaction_count,
            (SELECT COUNT(*) FROM photo_comments pc WHERE pc.photo_id = p.id) as comment_count,
            (SELECT reaction_type FROM photo_reactions pr WHERE pr.photo_id = p.id AND pr.user_id = ?) as my_reaction
            FROM photos p
            JOIN users u ON p.user_id = u.id
            $where
            $orderBy
            LIMIT $limit OFFSET $offset";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute(array_merge([$auth['user_id']], $params));
    $photos = $stmt->fetchAll();
    
    Response::paginate($photos, $total, $page, $limit);
}

function handleGetPhoto($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Photo ID required');
    }
    
    $stmt = $conn->prepare("
        SELECT p.*, u.display_name as uploader_name, u.avatar as uploader_avatar,
        a.title as anniversary_title
        FROM photos p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN anniversaries a ON p.anniversary_id = a.id
        WHERE p.id = ?
    ");
    $stmt->execute([$id]);
    $photo = $stmt->fetch();
    
    if (!$photo) {
        Response::error('Photo not found', 404);
    }
    
    // Get reactions
    $stmt = $conn->prepare("
        SELECT pr.*, u.display_name, u.avatar
        FROM photo_reactions pr
        JOIN users u ON pr.user_id = u.id
        WHERE pr.photo_id = ?
    ");
    $stmt->execute([$id]);
    $photo['reactions'] = $stmt->fetchAll();
    
    // Get comments
    $stmt = $conn->prepare("
        SELECT pc.*, u.display_name, u.avatar
        FROM photo_comments pc
        JOIN users u ON pc.user_id = u.id
        WHERE pc.photo_id = ?
        ORDER BY pc.created_at ASC
    ");
    $stmt->execute([$id]);
    $photo['comments'] = $stmt->fetchAll();
    
    Response::success($photo);
}

function handleUploadPhoto($conn) {
    $auth = JWT::requireAuth();
    
    if (!isset($_FILES['photo'])) {
        Response::error('No photo uploaded');
    }
    
    $result = FileUpload::uploadFile($_FILES['photo'], 'photos');
    
    if (!$result['success']) {
        Response::error($result['message']);
    }
    
    $caption = $_POST['caption'] ?? null;
    $location = $_POST['location'] ?? null;
    $photoDate = $_POST['photo_date'] ?? date('Y-m-d');
    $anniversaryId = !empty($_POST['anniversary_id']) ? $_POST['anniversary_id'] : null;
    $tags = !empty($_POST['tags']) ? json_encode(explode(',', $_POST['tags'])) : null;
    
    $stmt = $conn->prepare("
        INSERT INTO photos (user_id, anniversary_id, filename, original_name, file_path, thumbnail_path, 
                          caption, location, photo_date, tags, width, height, file_size, media_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $auth['user_id'],
        $anniversaryId,
        $result['filename'],
        $result['original_name'],
        $result['file_path'],
        $result['thumbnail_path'],
        $caption,
        $location,
        $photoDate,
        $tags,
        $result['width'],
        $result['height'],
        $result['file_size'],
        $result['media_type']
    ]);
    
    $photoId = $conn->lastInsertId();
    
    // Log activity
    $stmt = $conn->prepare("INSERT INTO activity_log (user_id, activity_type, reference_id, description) VALUES (?, 'photo_upload', ?, ?)");
    $stmt->execute([$auth['user_id'], $photoId, 'Uploaded a new memory']);
    
    // Get the created photo
    $stmt = $conn->prepare("SELECT * FROM photos WHERE id = ?");
    $stmt->execute([$photoId]);
    $photo = $stmt->fetch();
    
    Response::success($photo, 'Memory uploaded successfully! 📸', 201);
}

function handleUpdatePhoto($conn, $id, $data) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Photo ID required');
    }
    
    // Verify ownership
    $stmt = $conn->prepare("SELECT user_id FROM photos WHERE id = ?");
    $stmt->execute([$id]);
    $photo = $stmt->fetch();
    
    if (!$photo || $photo['user_id'] != $auth['user_id']) {
        Response::error('Photo not found or unauthorized', 403);
    }
    
    $fields = [];
    $values = [];
    
    $allowedFields = ['caption', 'location', 'photo_date', 'anniversary_id', 'tags'];
    
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $values[] = $field === 'tags' ? json_encode($data[$field]) : $data[$field];
        }
    }
    
    if (empty($fields)) {
        Response::error('No fields to update');
    }
    
    $values[] = $id;
    
    $stmt = $conn->prepare("UPDATE photos SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);
    
    $stmt = $conn->prepare("SELECT * FROM photos WHERE id = ?");
    $stmt->execute([$id]);
    $photo = $stmt->fetch();
    
    Response::success($photo, 'Photo updated');
}

function handleToggleFavorite($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Photo ID required');
    }
    
    $stmt = $conn->prepare("SELECT is_favorite FROM photos WHERE id = ?");
    $stmt->execute([$id]);
    $photo = $stmt->fetch();
    
    if (!$photo) {
        Response::error('Photo not found', 404);
    }
    
    $newStatus = !$photo['is_favorite'];
    
    $stmt = $conn->prepare("UPDATE photos SET is_favorite = ? WHERE id = ?");
    $stmt->execute([$newStatus, $id]);
    
    Response::success(['is_favorite' => $newStatus], $newStatus ? 'Added to favorites 💚' : 'Removed from favorites');
}

function handleDeletePhoto($conn, $id) {
    $auth = JWT::requireAuth();
    
    if (!$id) {
        Response::error('Photo ID required');
    }
    
    $stmt = $conn->prepare("SELECT * FROM photos WHERE id = ?");
    $stmt->execute([$id]);
    $photo = $stmt->fetch();
    
    if (!$photo || $photo['user_id'] != $auth['user_id']) {
        Response::error('Photo not found or unauthorized', 403);
    }
    
    // Delete file
    FileUpload::deleteFile($photo['file_path']);
    
    // Delete from database
    $stmt = $conn->prepare("DELETE FROM photos WHERE id = ?");
    $stmt->execute([$id]);
    
    Response::success(null, 'Photo deleted');
}

function handleGetFavorites($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    $stmt = $conn->prepare("
        SELECT p.*, u.display_name as uploader_name
        FROM photos p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id IN ($placeholders) AND p.is_favorite = 1
        ORDER BY p.photo_date DESC
    ");
    $stmt->execute($partnerIds);
    
    Response::success($stmt->fetchAll());
}

function handleGetPhotosByDate($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    // Group photos by month/year
    $stmt = $conn->prepare("
        SELECT DATE_FORMAT(photo_date, '%Y-%m') as month_year,
               DATE_FORMAT(photo_date, '%M %Y') as month_label,
               COUNT(*) as count
        FROM photos
        WHERE user_id IN ($placeholders)
        GROUP BY month_year
        ORDER BY month_year DESC
    ");
    $stmt->execute($partnerIds);
    
    Response::success($stmt->fetchAll());
}

function handleGetPhotosByAnniversary($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("
        SELECT a.id, a.title, a.anniversary_date, a.year_number,
               COUNT(p.id) as photo_count,
               (SELECT file_path FROM photos WHERE anniversary_id = a.id LIMIT 1) as cover_photo
        FROM anniversaries a
        LEFT JOIN photos p ON a.id = p.anniversary_id
        GROUP BY a.id
        ORDER BY a.anniversary_date DESC
    ");
    $stmt->execute();
    
    Response::success($stmt->fetchAll());
}

function handleGetTimeline($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    // Get photos grouped by year
    $stmt = $conn->prepare("
        SELECT YEAR(photo_date) as year,
               COUNT(*) as count,
               MIN(photo_date) as first_photo,
               MAX(photo_date) as last_photo
        FROM photos
        WHERE user_id IN ($placeholders) AND photo_date IS NOT NULL
        GROUP BY year
        ORDER BY year DESC
    ");
    $stmt->execute($partnerIds);
    
    Response::success($stmt->fetchAll());
}

function handleGetStats($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    $partnerIds = $user['partner_id'] ? [$auth['user_id'], $user['partner_id']] : [$auth['user_id']];
    
    $placeholders = implode(',', array_fill(0, count($partnerIds), '?'));
    
    $stats = [];
    
    // Total photos
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM photos WHERE user_id IN ($placeholders)");
    $stmt->execute($partnerIds);
    $stats['total_photos'] = $stmt->fetch()['count'];
    
    // Favorites
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM photos WHERE user_id IN ($placeholders) AND is_favorite = 1");
    $stmt->execute($partnerIds);
    $stats['favorites'] = $stmt->fetch()['count'];
    
    // Total memories
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM memories WHERE user_id IN ($placeholders)");
    $stmt->execute($partnerIds);
    $stats['memories'] = $stmt->fetch()['count'];
    
    // Messages exchanged
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM messages WHERE sender_id IN ($placeholders) OR receiver_id IN ($placeholders)");
    $stmt->execute(array_merge($partnerIds, $partnerIds));
    $stats['messages'] = $stmt->fetch()['count'];
    
    Response::success($stats);
}

function handleAddReaction($conn) {
    $auth = JWT::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['photo_id']) || empty($data['reaction_type'])) {
        Response::error('Photo ID and reaction type required');
    }
    
    // Check if reaction exists
    $stmt = $conn->prepare("SELECT id FROM photo_reactions WHERE photo_id = ? AND user_id = ?");
    $stmt->execute([$data['photo_id'], $auth['user_id']]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Update reaction
        $stmt = $conn->prepare("UPDATE photo_reactions SET reaction_type = ? WHERE id = ?");
        $stmt->execute([$data['reaction_type'], $existing['id']]);
    } else {
        // Insert new reaction
        $stmt = $conn->prepare("INSERT INTO photo_reactions (photo_id, user_id, reaction_type) VALUES (?, ?, ?)");
        $stmt->execute([$data['photo_id'], $auth['user_id'], $data['reaction_type']]);
    }
    
    Response::success(null, 'Reaction added 💚');
}

function handleAddComment($conn) {
    $auth = JWT::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (empty($data['photo_id']) || empty($data['content'])) {
        Response::error('Photo ID and content required');
    }
    
    $stmt = $conn->prepare("INSERT INTO photo_comments (photo_id, user_id, content) VALUES (?, ?, ?)");
    $stmt->execute([$data['photo_id'], $auth['user_id'], $data['content']]);
    
    $commentId = $conn->lastInsertId();
    
    $stmt = $conn->prepare("
        SELECT pc.*, u.display_name, u.avatar
        FROM photo_comments pc
        JOIN users u ON pc.user_id = u.id
        WHERE pc.id = ?
    ");
    $stmt->execute([$commentId]);
    
    Response::success($stmt->fetch(), 'Comment added', 201);
}
