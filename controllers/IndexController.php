<?php

class IndexController extends ControllerBase
{
    public function indexAction()
    {
        $this->_response->addData('method', $this->_controller->getMethod());
        $this->_response->addData('request', $this->_controller->getRequest());
        $this->_response->addData('controllerName', $this->_controller->getControllerName());
        $this->_response->addData('actionName', $this->_controller->getActionName());
        
        // $tblUsers = new TableUsers();
        // if (!$tblUsers->hasPseudo('admin')) {
        //     $id = $tblUsers->createLogin('admin', 'admin');
        //     $user = $tblUsers->query_by_id([$id]);
        //     $this->_response->addData('admin', $user);
        // }

        $this->_response->write();
    }

    public function insertAction()
    {
        if (!$this->isPOST()) {
            $this->addError("Only POST method is supported!");
        }
        
        $this->_response->addData('method', $this->_controller->getMethod());
        $this->_response->addData('request', $this->_controller->getRequest());
        $this->_response->addData('controllerName', $this->_controller->getControllerName());
        $this->_response->addData('actionName', $this->_controller->getActionName());

        $this->write();
    }
}
