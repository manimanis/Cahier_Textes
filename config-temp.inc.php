<?php
// Modify this file and save it as : config.inc.php

/**
 * Database configuration
 */
define('HOST', '127.0.0.1');
define('USER', 'root');
define('PASS', '');
define('BASE', 'fiches_rens');

define('SERVER_NAME', 'manimanis.github.io');
// Pour générer une nouvelle clé
// openssl rand -base64 172 | tr -d '\n'
define('SECRET_KEY', 'ep9tZ2TrdjbN2RtfpJ39rI6GL62PNuSaWlS9Q3n0TSzHP12IwYQO51TxiPBsxWGONq3N/sMfW08FctyYyW0q9vNwpSeGQvQsYKCJyXPlyt79m8m/9vNVmMggeCWl6pBGASBY4SS4o9AFxtV6Xj1iwGq3JcpRpqa03jIYl8o71E76PuJT6vqq/VtLVT/J1Oq/npnN4DBMAugXTzZetqkse+CfZB8/ykRhHBDDUA==');