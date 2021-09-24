<?php
class Response
{
    const OK_STATUS = 'ok';
    const ERROR_STATUS = 'errors';

    private ErrorCollection $_errors;
    private array $data;

    public function __construct()
    {
        $this->data = ['status' => Response::OK_STATUS];
        $this->_errors = new ErrorCollection();
    }

    public function hasErrors()
    {
        return $this->_errors->hasErrors();
    }

    public function addErrors(array $errors)
    {
        $this->_errors->addMany($errors);
    }

    public function addError(string $error)
    {
        $this->_errors->add($error);
    }

    public function addData($key, $data)
    {
        if (!key_exists('data', $this->data)) {
            $this->data['data'] = [];
        }
        $this->data['data'][$key] = $data;
    }

    public function write()
    {
        header('Content-Type: application/json');
        if ($this->hasErrors()) {
            $this->data['status'] = Response::ERROR_STATUS;
            $this->data['errors'] = $this->_errors->getAll();
        }
        echo json_encode($this->data);
    }
}
