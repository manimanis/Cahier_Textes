<?php
// Start session for authentication
session_start();

define("JSON_FOLDER", dirname(__FILE__)."/json");
// CLASSES are now loaded dynamically from json/config.json via IndexController
define("CLASSES", []);

require_once 'config.inc.php';

require_once 'inc/ErrorCollection.php';

require_once 'inc/UtilString.php';
require_once 'inc/Seances.php';

require_once 'inc/Response.php';

require_once 'inc/Controller.php';
require_once 'inc/ControllerBase.php';


Controller::getInstance()->run();