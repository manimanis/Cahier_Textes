<?php

class ControllerBase
{
    protected Controller $_controller;
    protected Response $_response;

    function __construct() {
        $this->_controller = Controller::getInstance();
        $this->_response = new Response();
    }

    public function getRequest() {
        return $this->_controller->getRequest();
    }

    public function isPOST() {
        return $this->_controller->isPOST();
    }

    public function isGET() {
        return $this->_controller->isGET();
    }

    public function addError(string $error) {
        $this->_response->addError($error);
    }

    public function addErrors(array $errors) {
        $this->_response->addErrors($errors);
    }

    public function addData($key, $data) {
        $this->_response->addData($key, $data);
    }

    public function write() {
        $this->_response->write();
    }

}
