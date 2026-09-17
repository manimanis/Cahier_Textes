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
define('SECRET_KEY', 'YWRtaW4=');