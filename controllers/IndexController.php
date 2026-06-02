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

    // Build filename: if year is specified, use year_classe.json
    $filename = $year ? "{$year}_{$classe}.json" : "{$classe}.json";

    $seance = new Seances($filename);
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

    $filename = $year ? "{$year}_{$classe}.json" : "{$classe}.json";

    $seance = new Seances($filename);
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
    $filename = $year ? "{$year}_{$classe}.json" : "{$classe}.json";

    $seance = new Seances($filename);
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
    $filename = $year ? "{$year}_{$classe}.json" : "{$classe}.json";

    $seance = new Seances($filename);
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

    if ($pseudo === 'admin' && $password === 'admin') {
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
