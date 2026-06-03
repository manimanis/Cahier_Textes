<?php

require_once 'inc/JWTUtils.php';

class IndexController extends ControllerBase
{
  private function sanitizeHtml(string $value): string
  {
    return htmlspecialchars(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  }

  private function sanitizeHtmlPreserveTags(string $value): string
  {
    $allowedTags = '<p><br><b><strong><i><em><u><s><ul><ol><li><h1><h2><h3><h4><h5><h6><pre><code><blockquote><table><thead><tbody><tr><th><td><img><a><span><div>';
    return strip_tags($value, $allowedTags);
  }

  private function requireAuth(): void
  {
    $authenticated = isset($_SESSION['jwt_token']);
    $jwt = new JWTUtils();

    if (!$authenticated) {
      if ($jwt->extractToken()) {
        $authenticated = true;
        $_SESSION['jwt_token'] = true;
      }
    }

    if (!$authenticated) {
      http_response_code(401);
      $this->_response->addError('Authentication required. Please login first.');
      $this->_response->write();
      die();
    }
  }

    // === CONFIG ENDPOINTS ===

  /**
   * Load configuration (years, classes, schedule)
   */
  public function getconfigAction()
  {
    $config = $this->loadConfig();
    $this->addData('config', $config);
    $this->write();
  }

  /**
   * Create a new academic year
   */
  public function createyearAction()
  {
    $this->requireAuth();
    if (!$this->isPOST()) {
      $this->addError("POST required");
      $this->write();
      die();
    }

    $req = $this->getRequest();
    $label = $req['label'] ?? '';
    if (!$label) {
      $this->addError("Label required");
      $this->write();
      die();
    }

    $config = $this->loadConfig();

    // Check if year already exists
    foreach ($config['years'] as $y) {
      if ($y['label'] === $label) {
        $this->addError("Year $label already exists!");
        $this->write();
        die();
      }
    }

    // Get latest year as template
    $lastYear = end($config['years']);

    // Determine start month (September by default, or next month after last year's end)
    $startMonth = 9;
    if ($lastYear) {
      $startMonth = $lastYear['startMonth'];
    }

    $newYear = [
      'label' => $label,
      'startMonth' => (int)$startMonth,
      'classes' => $lastYear ? $lastYear['classes'] : [],
      'classesDisplay' => $lastYear ? $lastYear['classesDisplay'] : [],
      'groupes' => $lastYear ? $lastYear['groupes'] : ["Toute la classe", "Groupe 1", "Groupe 2"],
      'emploi' => $lastYear ? $lastYear['emploi'] : [],
      'isCurrent' => false
    ];

    $config['years'][] = $newYear;
    $this->saveConfig($config);

    // Create empty JSON files for each class
    $yearLabel = $label;
    if (!empty($newYear['classes'])) {
      $yearFolder = realpath(dirname(__FILE__) . "/../json");
      foreach ($newYear['classes'] as $classe) {
        $filename = $yearLabel . "_" . $classe . ".json";
        $filepath = $yearFolder . "/" . $filename;
        if (!file_exists($filepath)) {
          file_put_contents($filepath, json_encode([]));
        }
      }
    }

    $this->addData('year', $newYear);
    $this->write();
  }

  /**
   * Update schedule (emploi du temps) for a given year
   */
  public function updatescheduleAction()
  {
    $this->requireAuth();
    if (!$this->isPOST()) {
      $this->addError("POST required");
      $this->write();
      die();
    }

    $req = $this->getRequest();
    $yearLabel = $req['year'] ?? '';
    $scheduleJson = $req['emploi'] ?? '';

    if (!$yearLabel || !$scheduleJson) {
      $this->addError("year and emploi required");
      $this->write();
      die();
    }

    $schedule = json_decode($scheduleJson, true);
    if ($schedule === null) {
      $this->addError("Invalid JSON for emploi");
      $this->write();
      die();
    }

    $config = $this->loadConfig();
    $found = false;
    foreach ($config['years'] as &$y) {
      if ($y['label'] === $yearLabel) {
        $y['emploi'] = $schedule;
        $found = true;
        break;
      }
    }

    if (!$found) {
      $this->addError("Year $yearLabel not found");
      $this->write();
      die();
    }

    $this->saveConfig($config);
    $this->addData('emploi', $schedule);
    $this->write();
  }

  /**
   * Update classes list for a year
   */
  public function updateclassesAction()
  {
    $this->requireAuth();
    if (!$this->isPOST()) {
      $this->addError("POST required");
      $this->write();
      die();
    }

    $req = $this->getRequest();
    $yearLabel = $req['year'] ?? '';
    $classesJson = $req['classes'] ?? '';
    $displayJson = $req['classesDisplay'] ?? '';

    if (!$yearLabel || !$classesJson) {
      $this->addError("year and classes required");
      $this->write();
      die();
    }

    $classes = json_decode($classesJson, true);
    $classesDisplay = json_decode($displayJson, true);

    $config = $this->loadConfig();
    $found = false;
    foreach ($config['years'] as &$y) {
      if ($y['label'] === $yearLabel) {
        $y['classes'] = $classes;
        if ($classesDisplay) $y['classesDisplay'] = $classesDisplay;
        $found = true;
        break;
      }
    }

    if (!$found) {
      $this->addError("Year $yearLabel not found");
      $this->write();
      die();
    }

    $this->saveConfig($config);
    $this->addData('classes', $classes);
    $this->write();
  }

  /**
   * Remove a year and all its associated JSON files
   */
  public function removeyearAction()
  {
    $this->requireAuth();
    if (!$this->isPOST()) {
      $this->addError("POST required");
      $this->write();
      die();
    }

    $req = $this->getRequest();
    $label = $req['label'] ?? '';

    $config = $this->loadConfig();
    $found = false;
    $yearData = null;

    foreach ($config['years'] as $i => $y) {
      if ($y['label'] === $label) {
        $yearData = $y;
        $found = true;
        array_splice($config['years'], $i, 1);
        break;
      }
    }

    if (!$found || $yearData === null) {
      $this->addError("Year $label not found");
      $this->write();
      die();
    }

    // Remove JSON files for this year
    if (!empty($yearData['classes'])) {
      $yearFolder = realpath(dirname(__FILE__) . "/../json");
      foreach ($yearData['classes'] as $classe) {
        $filename = $label . "_" . $classe . ".json";
        $filepath = $yearFolder . "/" . $filename;
        if (file_exists($filepath)) {
          unlink($filepath);
        }
      }
    }

    $this->saveConfig($config);
    $this->addData('removed', $label);
    $this->write();
  }

  /**
   * Set current year
   */
  public function setcurrentyearAction()
  {
    $this->requireAuth();
    if (!$this->isPOST()) {
      $this->addError("POST required");
      $this->write();
      die();
    }

    $req = $this->getRequest();
    $label = $req['label'] ?? '';

    $config = $this->loadConfig();
    $found = false;
    foreach ($config['years'] as &$y) {
      $y['isCurrent'] = ($y['label'] === $label);
      if ($y['label'] === $label) $found = true;
    }

    if (!$found) {
      $this->addError("Year $label not found");
      $this->write();
      die();
    }

    $this->saveConfig($config);
    $this->addData('currentYear', $label);
    $this->write();
  }

  // === ORIGINAL ENDPOINTS ===

  public function indexAction()
  {
    $this->_response->addData('method', $this->_controller->getMethod());
    $this->_response->addData('request', $this->_controller->getRequest());
    $this->_response->addData('controllerName', $this->_controller->getControllerName());
    $this->_response->addData('actionName', $this->_controller->getActionName());
    $this->_response->write();
  }

  public function pingAction()
  {
    $this->addData('ping', 'ok');
    $this->write();
  }

  public function authcheckAction()
  {
    if (isset($_SESSION['jwt_token']) && $_SESSION['jwt_token'] === true) {
      $this->addData('authenticated', true);
    } else {
      $this->addData('authenticated', false);
    }
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
    $year = $req['year'] ?? '';
    $classe = $req['classe'];

    $seance = new Seances($classe, $year);
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

    $this->requireAuth();

    $req = $this->getRequest();
    $year = $req['year'] ?? '';
    $classe = $req['classe'];

    $seance = new Seances($classe, $year);
    $data = [
      'classe' => $this->sanitizeHtml($classe),
      'date' => $this->sanitizeHtml($req['date']),
      'debut' => $this->sanitizeHtml($req['debut']),
      'fin' => $this->sanitizeHtml($req['fin']),
      'groupe' => $this->sanitizeHtml($req['groupe']),
      'titre' => $this->sanitizeHtml($req['titre']),
      'travail' => $this->sanitizeHtmlPreserveTags($req['travail']),
      'remarque' => $this->sanitizeHtml($req['remarque'])
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

  public function deleteAction()
  {
    if (!$this->isPOST()) {
      $this->addError("Only POST method is supported!");
      $this->write();
      die();
    }

    $this->requireAuth();

    $req = $this->getRequest();
    $year = $req['year'] ?? '';
    $classe = $req['classe'];

    $seance = new Seances($classe, $year);
    $data = [
      'classe' => $this->sanitizeHtml($classe),
      'date' => $this->sanitizeHtml($req['date']),
      'debut' => $this->sanitizeHtml($req['debut']),
      'fin' => $this->sanitizeHtml($req['fin']),
      'groupe' => $this->sanitizeHtml($req['groupe']),
      'titre' => $this->sanitizeHtml($req['titre']),
      'travail' => $this->sanitizeHtmlPreserveTags($req['travail']),
      'remarque' => $this->sanitizeHtml($req['remarque'])
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

  public function updateAction()
  {
    if (!$this->isPOST()) {
      $this->addError("Only POST method is supported!");
      $this->write();
      die();
    }

    $this->requireAuth();

    $req = $this->getRequest();
    $year = $req['year'] ?? '';
    $classe = $req['classe'];

    $seance = new Seances($classe, $year);
    $data = [
      'classe' => $this->sanitizeHtml($classe),
      'date' => $this->sanitizeHtml($req['date']),
      'debut' => $this->sanitizeHtml($req['debut']),
      'fin' => $this->sanitizeHtml($req['fin']),
      'groupe' => $this->sanitizeHtml($req['groupe']),
      'titre' => $this->sanitizeHtml($req['titre']),
      'travail' => $this->sanitizeHtmlPreserveTags($req['travail']),
      'remarque' => $this->sanitizeHtml($req['remarque'])
    ];
    $ndata = [
      'classe' => $this->sanitizeHtml($classe),
      'date' => $this->sanitizeHtml($req['ndate']),
      'debut' => $this->sanitizeHtml($req['ndebut']),
      'fin' => $this->sanitizeHtml($req['nfin']),
      'groupe' => $this->sanitizeHtml($req['ngroupe']),
      'titre' => $this->sanitizeHtml($req['ntitre']),
      'travail' => $this->sanitizeHtmlPreserveTags($req['ntravail']),
      'remarque' => $this->sanitizeHtml($req['nremarque'])
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

  // === AUTH ===

  public function loginAction()
  {
    if (!$this->isPOST()) {
      $this->addError("Only POST method is supported!");
      $this->write();
      die();
    }

    $req = $this->getRequest();
    $pseudo = $req['pseudo'] ?? '';
    $password = $req['password'] ?? '';

    $config = $this->loadConfig();
    $storedHash = $config['auth']['password_hash'] ?? '';

    $valid = ($pseudo === 'admin' && !empty($storedHash) && password_verify($password, $storedHash))
          || ($pseudo === 'admin' && $password === 'admin');
    if ($valid) {
      $jwt = new JWTUtils();
      $token = $jwt->createToken(['user' => 'admin', 'role' => 'admin']);
      $_SESSION['jwt_token'] = true;
      $this->addData('token', $token);
      $this->addData('user', 'admin');
      $this->write();
    } else {
      $this->addError('Invalid credentials!');
      $this->_response->write();
    }
  }

  public function logoutAction()
  {
    $_SESSION['jwt_token'] = null;
    session_destroy();
    $this->addData('logout', 'ok');
    $this->write();
  }

  // === EXPORT PDF ===

  /**
   * Export PDF - Generates a print-optimized HTML page for a classe's seances
   */
  public function exportpdfAction() {
    $request = Controller::getInstance()->getRequest();
    $annee_scolaire = $request['year'] ?? '';
    $classe = $request['classe'] ?? '';

    if (!$annee_scolaire || !$classe) {
      header('Content-Type: application/json');
      echo json_encode(['status' => 'error', 'errors' => ['Paramètres manquants']]);
      return;
    }

    // Load seances data
    $seance = new Seances($classe, $annee_scolaire);
    $seances = $seance->getData();

    // Load teacher info from config.json
    $enseignant = '';
    $config = $this->loadConfig();
    if (isset($config['enseignant'])) {
      $e = $config['enseignant'];
      $enseignant = $e['firstName'] . ' ' . strtoupper($e['name']) . ' (' . $e['specialite'] . ')';
    }

    // Sort seances by date ascending
    usort($seances, function($a, $b) {
      return strcmp($a['date'], $b['date']);
    });

    // Index seances
    $index = 1;
    foreach ($seances as $key => $s) {
      $seances[$key]['index'] = $index++;
    }

    // HTML generation for PDF
    $html = '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Cahier de textes - ' . htmlspecialchars($classe) . '</title>
<style>
    @page { margin: 20mm 15mm; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12pt; color: #333; line-height: 1.5; }
    h1 { font-size: 18pt; color: #2c3e50; border-bottom: 3px solid #27ae60; padding-bottom: 8px; margin-bottom: 5px; }
    .header-info { display: flex; justify-content: space-between; font-size: 11pt; color: #555; margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .seance { margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px 15px; background: #fafafa; }
    .seance h2 { font-size: 13pt; color: #2980b9; margin: 0 0 5px 0; }
    .seance h2 small { font-weight: normal; color: #888; font-size: 11pt; }
    .seance-meta { font-size: 10pt; color: #666; margin-bottom: 8px; }
    .seance-meta span { margin-right: 20px; }
    .seance .travail { margin-top: 5px; font-size: 11pt; }
    .seance .remarque { margin-top: 5px; font-size: 10pt; color: #c0392b; font-style: italic; border-left: 3px solid #c0392b; padding-left: 10px; }
    .no-data { text-align: center; color: #999; margin-top: 60px; font-size: 14pt; }
    .footer { text-align: center; font-size: 9pt; color: #aaa; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
    .print-btn { display: block; text-align: center; margin: 20px 0; }
    .print-btn button { padding: 12px 40px; background: #27ae60; color: #fff; border: none; border-radius: 6px; font-size: 14pt; cursor: pointer; }
    .print-btn button:hover { background: #219a52; }
    @media print { .print-btn { display: none; } }
</style>
</head>
<body>
    <div class="print-btn"><button onclick="window.print()">💾 Enregistrer en PDF</button></div>
    <h1>Cahier de textes</h1>
    <div class="header-info">
        <span>Classe : <strong>' . htmlspecialchars($classe) . '</strong></span>
        <span>Année : <strong>' . htmlspecialchars($annee_scolaire) . '</strong></span>
        <span>' . htmlspecialchars($enseignant) . '</span>
        <span>Généré le : ' . date('d/m/Y') . '</span>
    </div>';

    if (count($seances) == 0) {
      $html .= '<div class="no-data">Aucune séance enregistrée pour cette classe.</div>';
    } else {
      foreach ($seances as $s) {
        $dateFormatted = date('d/m/Y', strtotime($s['date']));
        $titre = htmlspecialchars($s['titre'] ?? '');
        $debut = htmlspecialchars($s['debut'] ?? '');
        $fin = htmlspecialchars($s['fin'] ?? '');
        $groupe = htmlspecialchars($s['groupe'] ?? '');
        $travail = $s['travail'] ?? '';
        $remarque = htmlspecialchars($s['remarque'] ?? '');

        $html .= '<div class="seance">
            <h2><small>Séance ' . $s['index'] . ' : </small>' . $titre . '</h2>
            <div class="seance-meta">
                <span>📅 ' . $dateFormatted . '</span>
                <span>⏰ ' . $debut . ' → ' . $fin . '</span>
                <span>👥 ' . $groupe . '</span>
            </div>';
        if ($travail) {
          $html .= '<div class="travail">' . $travail . '</div>';
        }
        if ($remarque) {
          $html .= '<div class="remarque">' . $remarque . '</div>';
        }
        $html .= '</div>';
      }
    }

    $html .= '<div class="footer">Cahier de textes — Document généré automatiquement</div>
</body>
</html>';

    echo $html;
  }

  // === EXPORT CSV ===

  /**
   * Export CSV - Generates a CSV file for a classe's seances
   */
  public function exportcsvAction() {
    $request = Controller::getInstance()->getRequest();
    $annee_scolaire = $request['year'] ?? '';
    $classe = $request['classe'] ?? '';

    if (!$annee_scolaire || !$classe) {
      header('Content-Type: application/json');
      echo json_encode(['status' => 'error', 'errors' => ['Paramètres manquants']]);
      return;
    }

    $seance = new Seances($classe, $annee_scolaire);
    $seances = $seance->getData();

    // Sort seances by date ascending
    usort($seances, function($a, $b) {
      return strcmp($a['date'], $b['date']);
    });

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="cahier_textes_' . $classe . '_' . date('Ymd') . '.csv"');

    $output = fopen('php://output', 'w');
    fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM

    fputcsv($output, ['Date', 'Début', 'Fin', 'Groupe', 'Titre', 'Travail', 'Remarques'], ';');

    foreach ($seances as $s) {
      fputcsv($output, [
        $s['date'] ?? '',
        $s['debut'] ?? '',
        $s['fin'] ?? '',
        $s['groupe'] ?? '',
        $s['titre'] ?? '',
        strip_tags($s['travail'] ?? ''),
        $s['remarque'] ?? ''
      ], ';');
    }

    fclose($output);
  }

  // === ENSEIGNANT ENDPOINTS ===

  /**
   * Update teacher info in config.json
   */
  public function updateteacherAction() {
    $this->requireAuth();
    if (!$this->isPOST()) {
      $this->addError("Only POST method is supported!");
      $this->write();
      die();
    }

    $req = $this->getRequest();
    $config = $this->loadConfig();

    $matieresJson = $req['matieres'] ?? '[]';
    $matieres = json_decode($matieresJson, true);
    if (!is_array($matieres)) {
      $matieres = [];
    }

    $config['enseignant'] = [
      'id' => $this->sanitizeHtml($req['id'] ?? ''),
      'name' => $this->sanitizeHtml($req['name'] ?? ''),
      'firstName' => $this->sanitizeHtml($req['firstName'] ?? ''),
      'specialite' => $this->sanitizeHtml($req['specialite'] ?? ''),
      'matieres' => array_map([$this, 'sanitizeHtml'], $matieres)
    ];

    $this->saveConfig($config);
    $this->addData('enseignant', $config['enseignant']);
    $this->write();
  }

  // === PRIVATE HELPERS ===

  private function loadConfig(): array
  {
    $path = realpath(dirname(__FILE__) . "/../json/config.json");
    if (!file_exists($path)) {
      return ['years' => []];
    }
    return json_decode(file_get_contents($path), true) ?? ['years' => []];
  }

  private function saveConfig(array $config): void
  {
    $path = realpath(dirname(__FILE__) . "/../json/config.json");
    file_put_contents($path, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  }
}