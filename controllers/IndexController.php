<?php

require_once 'inc/JWTUtils.php';

class IndexController extends ControllerBase
{
    private function sanitizeHtml(string $value): string
    {
        // For text fields, strip all HTML tags
        return htmlspecialchars(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function sanitizeHtmlPreserveTags(string $value): string
    {
        // For work/travail content that needs some HTML (via Jodit editor),
        // allow safe tags only
        $allowedTags = '<p><br><b><strong><i><em><u><s><ul><ol><li><h1><h2><h3><h4><h5><h6><pre><code><blockquote><table><thead><tbody><tr><th><td><img><a><span><div>';
        return strip_tags($value, $allowedTags);
    }

    /**
     * Require authentication via JWT. Returns the token payload if valid, dies with 401 otherwise.
     */
    private function requireAuth(): void
    {
        // First check for a session-based auth token
        $authenticated = isset($_SESSION['jwt_token']);
        $jwt = new JWTUtils();

        if (!$authenticated) {
            // Check Authorization header as fallback
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

    /**
     * Check if the user has an active authenticated session
     */
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

        $this->requireAuth();

        $req = $this->getRequest();
        if (!in_array($req['classe'], CLASSES)) {
            $this->addError("The classe field is not valid!");
            $this->write();
            die();
        }

        $seance = new Seances($req['classe']);
        $data = [
            'classe' => $this->sanitizeHtml($req['classe']),
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

    public function deleteAction() {
        if (!$this->isPOST()) {
            $this->addError("Only POST method is supported!");
            $this->write();
            die();
        }

        $this->requireAuth();

        $req = $this->getRequest();
        if (!in_array($req['classe'], CLASSES)) {
            $this->addError("The classe field is not valid!");
            $this->write();
            die();
        }
        $seance = new Seances($req['classe']);
        $data = [
            'classe' => $this->sanitizeHtml($req['classe']),
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

    public function updateAction() {
        if (!$this->isPOST()) {
            $this->addError("Only POST method is supported!");
            $this->write();
            die();
        }

        $this->requireAuth();

        $req = $this->getRequest();
        if (!in_array($req['classe'], CLASSES)) {
            $this->addError("The classe field is not valid!");
            $this->write();
            die();
        }
        $seance = new Seances($req['classe']);
        $data = [
            'classe' => $this->sanitizeHtml($req['classe']),
            'date' => $this->sanitizeHtml($req['date']),
            'debut' => $this->sanitizeHtml($req['debut']),
            'fin' => $this->sanitizeHtml($req['fin']),
            'groupe' => $this->sanitizeHtml($req['groupe']),
            'titre' => $this->sanitizeHtml($req['titre']),
            'travail' => $this->sanitizeHtmlPreserveTags($req['travail']),
            'remarque' => $this->sanitizeHtml($req['remarque'])
        ];
        $ndata = [
            'classe' => $this->sanitizeHtml($req['nclasse']),
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

    /**
     * Login endpoint - generates a JWT token
     */
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

        // Simple hardcoded credentials for demo
        // In production, use database verification
        if ($pseudo === 'admin' && $password === 'admin') {
            $jwt = new JWTUtils();
            $token = $jwt->createToken([
                'user' => 'admin',
                'role' => 'admin'
            ]);

            // Store in session
            $_SESSION['jwt_token'] = true;

            $this->addData('token', $token);
            $this->addData('user', 'admin');
            $this->write();
        } else {
            $this->addError('Invalid credentials!');
            $this->_response->write();
        }
    }

    /**
     * Logout endpoint
     */
    public function logoutAction()
    {
        $_SESSION['jwt_token'] = null;
        session_destroy();
        $this->addData('logout', 'ok');
        $this->write();
    }
}