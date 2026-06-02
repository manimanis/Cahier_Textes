<?php
/**
 * Database configuration
 */
define('HOST', '127.0.0.1');
define('USER', 'root');
define('PASS', 'mysqlroot');
define('BASE', 'fiches_rens');

define('SERVER_NAME', 'manimanis.github.io');
// Pour générer une nouvelle clé :
// php -r "echo base64_encode(random_bytes(64));"
define('SECRET_KEY', 'f8a2c9d4e1b7f3a6c8d0e2f4b6a8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4c6d8e0f2a4c6d8e0f2a4');