<?php
class Controller
{
    private static ?Controller $controller = null;

    protected string $_remote;
    protected string $_method;
    protected array $_request = [];
    protected string $_controllerName = '';
    protected string $_actionName = '';

    private function __construct() {
        $this->_method = strtoupper($_SERVER['REQUEST_METHOD']);
        $this->_remote = $_SERVER['REMOTE_ADDR'];
        $this->_request = array_merge($_GET, $_POST);
        $this->_controllerName = (key_exists('cnt', $this->_request)) ? $this->_request['cnt'] : 'index';
        $this->_actionName = (key_exists('act', $this->_request)) ? $this->_request['act'] : 'index';
    }

    public static function getInstance() {
        if (Controller::$controller == null) {
            Controller::$controller = new Controller();
        }
        return Controller::$controller;
    }

    function getMethod() {
        return $this->_method;
    }

    function isPOST() {
        return $this->_method == "POST";
    }

    function isGET() {
        return $this->_method == "GET";
    }

    function getRequest() {
        return $this->_request;
    }

    function getRemote() {
        return $this->_remote;
    }

    function getControllerName() {
        return $this->_controllerName;
    }

    function getActionName() {
        return $this->_actionName;
    }

    function run() {
        $classname = ucfirst($this->_controllerName) . 'Controller';
        $methodname = $this->_actionName . 'Action';
        require_once "controllers/$classname.php";

        $controllerObj = new $classname();
        $controllerObj->$methodname();
    }
}
