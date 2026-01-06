<?php
/**
 * Authentication API
 * Anniversary Web App
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/upload.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $db = new Database();
    $conn = $db->getConnection();
} catch (Exception $e) {
    Response::error("Database connection failed: " . $e->getMessage(), 500);
}

switch ($method) {
    case 'POST':
        // Only decode JSON if content type is application/json
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $data = null;
        
        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents('php://input'), true);
        }
        
        switch ($action) {
            case 'login':
                handleLogin($conn, $data);
                break;
            case 'register':
                handleRegister($conn, $data);
                break;
            case 'logout':
                handleLogout();
                break;
            case 'upload-avatar':
                handleUploadAvatar($conn);
                break;
            default:
                Response::error('Invalid action', 400);
        }
        break;
        
    case 'GET':
        switch ($action) {
            case 'me':
                handleGetCurrentUser($conn);
                break;
            case 'partner':
                handleGetPartner($conn);
                break;
            default:
                Response::error('Invalid action', 400);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        switch ($action) {
            case 'profile':
                handleUpdateProfile($conn, $data);
                break;
            case 'password':
                handleUpdatePassword($conn, $data);
                break;
            case 'link-partner':
                handleLinkPartner($conn, $data);
                break;
            default:
                Response::error('Invalid action', 400);
        }
        break;
        
    default:
        Response::error('Method not allowed', 405);
}

function handleLogin($conn, $data) {
    if (empty($data['username']) || empty($data['password'])) {
        Response::error('Username and password are required');
    }

    if (!verifyRecaptcha($data['recaptcha_token'] ?? '')) {
        Response::error('Recaptcha verification failed', 403);
    }
    
    $stmt = $conn->prepare("SELECT id, username, email, password, display_name, avatar, partner_id FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$data['username'], $data['username']]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($data['password'], $user['password'])) {
        Response::error('Invalid credentials', 401);
    }
    
    unset($user['password']);
    
    $token = JWT::encode([
        'user_id' => $user['id'],
        'username' => $user['username']
    ]);
    
    // Get partner info if linked
    $partner = null;
    if ($user['partner_id']) {
        $stmt = $conn->prepare("SELECT id, username, display_name, avatar FROM users WHERE id = ?");
        $stmt->execute([$user['partner_id']]);
        $partner = $stmt->fetch();
    }
    
    Response::success([
        'user' => $user,
        'partner' => $partner,
        'token' => $token
    ], 'Login successful');
}

function handleRegister($conn, $data) {
    $required = ['username', 'email', 'password', 'display_name'];
    
    foreach ($required as $field) {
        if (empty($data[$field])) {
            Response::error("$field is required");
        }
    }

    if (!verifyRecaptcha($data['recaptcha_token'] ?? '')) {
        Response::error('Recaptcha verification failed', 403);
    }
    
    // Check if username or email exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$data['username'], $data['email']]);
    
    if ($stmt->fetch()) {
        Response::error('Username or email already exists');
    }
    
    // Validate password
    if (strlen($data['password']) < 6) {
        Response::error('Password must be at least 6 characters');
    }
    
    $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
    
    $stmt = $conn->prepare("INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $data['username'],
        $data['email'],
        $hashedPassword,
        $data['display_name']
    ]);
    
    $userId = $conn->lastInsertId();
    
    $token = JWT::encode([
        'user_id' => $userId,
        'username' => $data['username']
    ]);
    
    Response::success([
        'user' => [
            'id' => $userId,
            'username' => $data['username'],
            'email' => $data['email'],
            'display_name' => $data['display_name']
        ],
        'token' => $token
    ], 'Registration successful', 201);
}

function handleLogout() {
    Response::success(null, 'Logged out successfully');
}

function handleGetCurrentUser($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT id, username, email, display_name, avatar, partner_id, created_at FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        Response::error('User not found', 404);
    }
    
    Response::success($user);
}

function handleGetPartner($conn) {
    $auth = JWT::requireAuth();
    
    $stmt = $conn->prepare("SELECT partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user['partner_id']) {
        Response::success(null, 'No partner linked');
    }
    
    $stmt = $conn->prepare("SELECT id, username, display_name, avatar, created_at FROM users WHERE id = ?");
    $stmt->execute([$user['partner_id']]);
    $partner = $stmt->fetch();
    
    Response::success($partner);
}

function handleUpdateProfile($conn, $data) {
    $auth = JWT::requireAuth();
    
    $fields = [];
    $values = [];
    
    if (!empty($data['display_name'])) {
        $fields[] = "display_name = ?";
        $values[] = $data['display_name'];
    }
    
    if (!empty($data['email'])) {
        // Check if email is taken
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$data['email'], $auth['user_id']]);
        if ($stmt->fetch()) {
            Response::error('Email already in use');
        }
        $fields[] = "email = ?";
        $values[] = $data['email'];
    }
    
    if (!empty($data['avatar'])) {
        $fields[] = "avatar = ?";
        $values[] = $data['avatar'];
    }
    
    if (empty($fields)) {
        Response::error('No fields to update');
    }
    
    $values[] = $auth['user_id'];
    
    $stmt = $conn->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($values);
    
    // Get updated user
    $stmt = $conn->prepare("SELECT id, username, email, display_name, avatar, partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    Response::success($user, 'Profile updated');
}

function handleUpdatePassword($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['current_password']) || empty($data['new_password'])) {
        Response::error('Current password and new password are required');
    }
    
    $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!password_verify($data['current_password'], $user['password'])) {
        Response::error('Current password is incorrect');
    }
    
    if (strlen($data['new_password']) < 6) {
        Response::error('New password must be at least 6 characters');
    }
    
    $hashedPassword = password_hash($data['new_password'], PASSWORD_BCRYPT);
    
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $auth['user_id']]);
    
    Response::success(null, 'Password updated');
}

function handleLinkPartner($conn, $data) {
    $auth = JWT::requireAuth();
    
    if (empty($data['partner_username'])) {
        Response::error('Partner username is required');
    }
    
    // Find partner
    $stmt = $conn->prepare("SELECT id, username, display_name FROM users WHERE username = ?");
    $stmt->execute([$data['partner_username']]);
    $partner = $stmt->fetch();
    
    if (!$partner) {
        Response::error('Partner not found');
    }
    
    if ($partner['id'] == $auth['user_id']) {
        Response::error('You cannot link yourself as a partner');
    }
    
    // Link both users together
    $stmt = $conn->prepare("UPDATE users SET partner_id = ? WHERE id = ?");
    $stmt->execute([$partner['id'], $auth['user_id']]);
    $stmt->execute([$auth['user_id'], $partner['id']]);
    
    Response::success($partner, 'Partner linked successfully! 💚');
}

function handleUploadAvatar($conn) {
    $auth = JWT::requireAuth();
    
    if (!isset($_FILES['avatar'])) {
        Response::error('No file uploaded');
    }
    
    $result = FileUpload::uploadImage($_FILES['avatar'], 'avatars');
    
    if (!$result['success']) {
        Response::error($result['message']);
    }
    
    $filename = $result['file_path'];
    
    // Update user avatar in database
    $stmt = $conn->prepare("UPDATE users SET avatar = ? WHERE id = ?");
    $stmt->execute([$filename, $auth['user_id']]);
    
    // Get updated user
    $stmt = $conn->prepare("SELECT id, username, email, display_name, avatar, partner_id FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    Response::success($user, 'Avatar updated successfully! ✨');
}

function verifyRecaptcha($token) {
    if (empty($token)) {
        return false;
    }
    
    $env = require __DIR__ . '/../config/env.php';
    $secret = $env['RECAPTCHA_SECRET'];
    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $data = [
        'secret' => $secret,
        'response' => $token
    ];
    
    $options = [
        'http' => [
            'header' => "Content-type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    $response = json_decode($result);
    
    return $response->success && $response->score >= 0.5;
}
