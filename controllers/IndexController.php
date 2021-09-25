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

    public function pingAction()
    {
        $this->addData('ping', 'ok');
        $this->write();
    }

    public function listAction()
    {
        $req = $this->getRequest();
        if (!key_exists("classe", $req)) {
            $this->addError("You must specify the classe field!");
            $this->write();
            die();
        }
        if (!in_array($req['classe'], CLASSES)) {
            $this->addError("The classe field is not valid!");
            $this->write();
            die();
        }
        $seance = new Seances($req['classe']);
        $this->addData("seances", $seance->getData());
        $this->write();
    }

    public function insertAction()
    {
        if (!$this->isPOST()) {
            $this->addError("Only POST method is supported!");
            $this->write();
            die();
        }
        $req = $this->getRequest();
        if (!in_array($req['classe'], CLASSES)) {
            $this->addError("The classe field is not valid!");
            $this->write();
            die();
        }
        $seance = new Seances($req['classe']);
        $data = [
            'classe' => $req['classe'],
            'date' => $req['date'],
            'debut' => $req['debut'],
            'fin' => $req['fin'],
            'groupe' => $req['groupe'],
            'titre' => $req['titre'],
            'travail' => $req['travail'],
            'remarque' => $req['remarque']
        ];
        $id = $seance->insert($data);
        if ($id == -1) {
            $this->addError("Data duplicate for this record!");
            $this->addData("data", $data);
            $this->write();
            die();
        }
        $seance->save();
        $this->addData("id", $id);
        $this->addData("data", $data);
        $this->write();
    }

    public function deleteAction() {
        if (!$this->isPOST()) {
            $this->addError("Only POST method is supported!");
            $this->write();
            die();
        }

        $req = $this->getRequest();
        if (!in_array($req['classe'], CLASSES)) {
            $this->addError("The classe field is not valid!");
            $this->write();
            die();
        }
        $seance = new Seances($req['classe']);
        $data = [
            'classe' => $req['classe'],
            'date' => $req['date'],
            'debut' => $req['debut'],
            'fin' => $req['fin'],
            'groupe' => $req['groupe'],
            'titre' => $req['titre'],
            'travail' => $req['travail'],
            'remarque' => $req['remarque']
        ];
        $idx = $seance->find($data);
        if ($idx == -1) {
            $this->addError("This class seance was not found!");
            $this->write();
            die();
        }
        $seance->delete($idx);
        $seance->save();
        $this->write();
    }

    public function updateAction() {
        if (!$this->isPOST()) {
            $this->addError("Only POST method is supported!");
            $this->write();
            die();
        }

        $req = $this->getRequest();
        if (!in_array($req['classe'], CLASSES)) {
            $this->addError("The classe field is not valid!");
            $this->write();
            die();
        }
        $seance = new Seances($req['classe']);
        $data = [
            'classe' => $req['classe'],
            'date' => $req['date'],
            'debut' => $req['debut'],
            'fin' => $req['fin'],
            'groupe' => $req['groupe'],
            'titre' => $req['titre'],
            'travail' => $req['travail'],
            'remarque' => $req['remarque']
        ];
        $ndata = [
            'classe' => $req['nclasse'],
            'date' => $req['ndate'],
            'debut' => $req['ndebut'],
            'fin' => $req['nfin'],
            'groupe' => $req['ngroupe'],
            'titre' => $req['ntitre'],
            'travail' => $req['ntravail'],
            'remarque' => $req['nremarque']
        ];
        $idx = $seance->find($data);
        if ($idx == -1) {
            $this->addError("This class seance was not found!");
            $this->write();
            die();
        }
        $seance->update($idx, $ndata);
        $seance->save();
        $this->write();
    }

}
