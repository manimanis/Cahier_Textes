<?php
define("JSON_FOLDER", dirname(__FILE__)."/json");
define("CLASSES", ["2TI1", "4T1", "3T1", "2SC1"]);

require_once 'inc/ErrorCollection.php';

require_once 'inc/UtilString.php';
require_once 'inc/Seances.php';

require_once 'inc/Response.php';

require_once 'inc/Controller.php';
require_once 'inc/ControllerBase.php';


Controller::getInstance()->run();
