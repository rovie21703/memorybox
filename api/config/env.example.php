<?php
/**
 * Environment Configuration Template
 * 
 * Copy this file to env.php and fill in your actual values.
 * NEVER commit env.php to version control!
 */

return [
    'DB_HOST' => 'your_database_host',
    'DB_NAME' => 'your_database_name',
    'DB_USER' => 'your_database_user',
    'DB_PASS' => 'your_database_password',
    'JWT_SECRET' => 'your_jwt_secret_key_here',
    'RECAPTCHA_SECRET' => 'your_recaptcha_secret_key',
    'ALLOWED_ORIGINS' => [
        'https://your-production-domain.com',
        'http://localhost:3000'
    ]
];
