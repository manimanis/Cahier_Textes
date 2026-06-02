<?php
class Seances
{
    private $_classe;
    private $_filename;
    private $_data;

    /**
     * @param string $classeOrFilename Nom de classe simple (2TI1) ou fichier complet (2025_2026_2TI1.json)
     */
    public function __construct($classeOrFilename)
    {
        // Si le paramètre contient un point, c'est un nom de fichier complet
        if (strpos($classeOrFilename, '.') !== false) {
            $this->_filename = JSON_FOLDER . "/" . $classeOrFilename;
            // Extraire le nom de classe du fichier
            $parts = explode('_', basename($classeOrFilename, '.json'));
            $this->_classe = end($parts);
        } else {
            $this->_classe = $classeOrFilename;
            $this->_filename = JSON_FOLDER . "/" . $classeOrFilename . ".json";
        }
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
        file_put_contents($this->_filename, json_encode($this->_data, JSON_UNESCAPED_UNICODE));
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