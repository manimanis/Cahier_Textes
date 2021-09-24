<?php

class ErrorCollection {
    protected array $_errors;

    public function __construct() {
        $this->_errors = [];
    }

    public function hasErrors() {
        return count($this->_errors) > 0;
    }

    public function clear() {
        $this->_errors = [];
    }

    public function add(string $error) {
        $this->_errors[] = $error;
    }

    public function addMany(array $errors) {
        foreach($errors as $err) {
            $this->_errors[] = $err;
        }
    }

    public function count() {
        return count($this->_errors);
    }

    public function get(int $index) {
        return $this->_errors[$index];
    }

    public function getAll() {
        return $this->_errors;
    }
}