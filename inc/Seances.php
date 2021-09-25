<?php
class Seances
{
    private $_classe;
    private $_filename;
    private $_data;

    public function __construct($classe)
    {
        $this->_classe = $classe;
        $this->_filename = JSON_FOLDER . "/" . $classe . ".json";
        $this->load();
    }

    public function load()
    {
        if (file_exists($this->_filename)) {
            $this->_data = json_decode(file_get_contents($this->_filename), true);
        } else {
            $this->_data = [];
        }
    }

    public function save()
    {
        file_put_contents($this->_filename, json_encode($this->_data));
    }

    public function find($record) {
        foreach ($this->_data as $idx => $orec) {
            if (
                $record['date'] == $orec['date'] &&
                $record['debut'] == $orec['debut'] &&
                $record['fin'] == $orec['fin'] &&
                $record['groupe'] == $orec['groupe']
            ) {
                return $idx;
            }
        }
        return -1;
    }

    public function isNew($record)
    {
        return $this->find($record) == -1;
    }

    public function insert($record)
    {
        if ($this->isNew($record)) {
            $count = count($this->_data);
            $this->_data[] = $record;
            return $count;
        }
        return -1;
    }

    public function update($idx, $record) {
        $pos = $this->find($record);
        if ($pos != -1 && $pos != $idx) {
            return false;
        }
        $this->_data[$idx] = $record;
        return true;
    }

    public function delete($idx) {
        array_splice($this->_data, $idx, 1);
    }

    public function getData() {
        return $this->_data;
    }

    public function getClasse() {
        return $this->_classe;
    }

    public function getFilename() {
        return $this->_filename;
    }
}
