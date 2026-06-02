<?php
// Modify this file and save it as : config.inc.php
// IMPORTANT: Never commit the real config.inc.php with production secrets to Git!

/**
 * Database configuration
 */
define('HOST', '127.0.0.1');
define('USER', 'root');
define('PASS', '');
define('BASE', 'fiches_rens');

define('SERVER_NAME', 'localhost');
// Pour générer une nouvelle clé, exécutez dans un terminal :
// php -r "echo base64_encode(random_bytes(64));"
// Remplacez SECRET_KEY ci-dessous par la valeur générée
define('SECRET_KEY', 'CHANGE_ME_WITH_A_RANDOM_SECRET_KEY');