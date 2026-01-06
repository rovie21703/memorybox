<?php
/**
 * File Upload Helper
 * Anniversary Web App
 */

require_once __DIR__ . '/../config/config.php';

class FileUpload {
    
    public static function uploadFile($file, $subfolder = '') {
        // Validate file
        if (!isset($file['tmp_name']) || empty($file['tmp_name'])) {
            return ['success' => false, 'message' => 'No file uploaded'];
        }
        
        // Check file size
        if ($file['size'] > MAX_FILE_SIZE) {
            return ['success' => false, 'message' => 'File too large. Maximum size is 2GB'];
        }
        
        // Get file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if (!in_array($extension, ALLOWED_EXTENSIONS)) {
            return ['success' => false, 'message' => 'Invalid file type. Allowed: ' . implode(', ', ALLOWED_EXTENSIONS)];
        }

        $videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
        $isVideo = in_array($extension, $videoExtensions);
        $mediaType = $isVideo ? 'video' : 'image';
        
        $width = null;
        $height = null;

        if (!$isVideo) {
            // Verify it's actually an image
            $imageInfo = getimagesize($file['tmp_name']);
            if ($imageInfo === false) {
                return ['success' => false, 'message' => 'Invalid image file'];
            }
            $width = $imageInfo[0];
            $height = $imageInfo[1];
        }
        
        // Generate unique filename
        $prefix = $isVideo ? 'vid_' : 'img_';
        try {
            $random = bin2hex(random_bytes(16));
        } catch (Exception $e) {
            $random = uniqid('', true);
        }
        $filename = $prefix . $random . '.' . $extension;
        
        // Create upload directory if it doesn't exist
        $uploadPath = UPLOAD_PATH . ($subfolder ? $subfolder . '/' : '');
        if (!is_dir($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }
        
        $filePath = $uploadPath . $filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            return ['success' => false, 'message' => 'Failed to save file'];
        }
        
        // Create thumbnail only for images
        $thumbnailPath = null;
        if (!$isVideo) {
            $thumbnailPath = self::createThumbnail($filePath, $filename, $subfolder);
        }
        
        return [
            'success' => true,
            'filename' => $filename,
            'original_name' => $file['name'],
            'file_path' => ($subfolder ? $subfolder . '/' : '') . $filename,
            'thumbnail_path' => $thumbnailPath,
            'width' => $width,
            'height' => $height,
            'file_size' => $file['size'],
            'media_type' => $mediaType
        ];
    }

    // Keep backward compatibility if needed, or just remove it if I update all calls
    public static function uploadImage($file, $subfolder = '') {
        return self::uploadFile($file, $subfolder);
    }
    
    private static function createThumbnail($sourcePath, $filename, $subfolder = '') {
        $thumbnailDir = THUMBNAIL_PATH . ($subfolder ? $subfolder . '/' : '');
        
        if (!is_dir($thumbnailDir)) {
            mkdir($thumbnailDir, 0755, true);
        }
        
        $thumbnailPath = $thumbnailDir . $filename;
        $thumbWidth = 300;
        
        $imageInfo = getimagesize($sourcePath);
        $mime = $imageInfo['mime'];
        
        switch ($mime) {
            case 'image/jpeg':
                $source = imagecreatefromjpeg($sourcePath);
                break;
            case 'image/png':
                $source = imagecreatefrompng($sourcePath);
                break;
            case 'image/gif':
                $source = imagecreatefromgif($sourcePath);
                break;
            case 'image/webp':
                $source = imagecreatefromwebp($sourcePath);
                break;
            default:
                return null;
        }
        
        if (!$source) {
            return null;
        }
        
        $origWidth = imagesx($source);
        $origHeight = imagesy($source);
        
        $ratio = $thumbWidth / $origWidth;
        $thumbHeight = (int)($origHeight * $ratio);
        
        $thumbnail = imagecreatetruecolor($thumbWidth, $thumbHeight);
        
        // Preserve transparency for PNG and GIF
        if ($mime === 'image/png' || $mime === 'image/gif') {
            imagealphablending($thumbnail, false);
            imagesavealpha($thumbnail, true);
            $transparent = imagecolorallocatealpha($thumbnail, 0, 0, 0, 127);
            imagefill($thumbnail, 0, 0, $transparent);
        }
        
        imagecopyresampled($thumbnail, $source, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $origWidth, $origHeight);
        
        switch ($mime) {
            case 'image/jpeg':
                imagejpeg($thumbnail, $thumbnailPath, 85);
                break;
            case 'image/png':
                imagepng($thumbnail, $thumbnailPath, 8);
                break;
            case 'image/gif':
                imagegif($thumbnail, $thumbnailPath);
                break;
            case 'image/webp':
                imagewebp($thumbnail, $thumbnailPath, 85);
                break;
        }
        
        imagedestroy($source);
        imagedestroy($thumbnail);
        
        return 'thumbnails/' . ($subfolder ? $subfolder . '/' : '') . $filename;
    }
    
    public static function deleteFile($filePath) {
        $fullPath = UPLOAD_PATH . $filePath;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
        
        // Also delete thumbnail
        $thumbPath = THUMBNAIL_PATH . $filePath;
        if (file_exists($thumbPath)) {
            unlink($thumbPath);
        }
        
        return true;
    }
}
