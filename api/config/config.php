<?php
/**
 * JWT Configuration
 * Anniversary Web App
 */

$env = require __DIR__ . '/env.php';

define('JWT_SECRET', $env['JWT_SECRET']);
define('JWT_EXPIRY', 86400 * 7); // 7 days
define('UPLOAD_PATH', dirname(__DIR__, 2) . '/uploads/');
define('THUMBNAIL_PATH', dirname(__DIR__, 2) . '/uploads/thumbnails/');
define('MAX_FILE_SIZE', 2 * 1024 * 1024 * 1024); // 2GB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm']);
