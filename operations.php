<?php
define("JSON_FOLDER", dirname(__FILE__)."/json");
define("CLASSES", ["2TI", "4ECO", "4T"]);

require_once 'inc/ErrorCollection.php';

require_once 'inc/UtilString.php';
require_once 'inc/Seances.php';

require_once 'inc/Response.php';

require_once 'inc/Controller.php';
require_once 'inc/ControllerBase.php';


Controller::getInstance()->run();
