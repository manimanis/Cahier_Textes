<?php

use Firebase\JWT\JWT;

class JWTUtils
{
    private bool $_hasToken;
    private $_token;
    private string $_headerError;
    private string $_reason;

    public function __construct()
    {
        $this->_hasToken = false;
        $this->_token = null;
        $this->_headerError = '';
        $this->_reason = '';
    }

    public function createToken(
        array $payload,
        DateTimeImmutable $issuedAt=null,
        DateTimeImmutable $expireAt=null
    ) {
        if ($issuedAt == null) {
            $issuedAt = new DateTimeImmutable();
        }
        if ($expireAt == null) {
            $expireAt = $issuedAt->modify('+60 minutes');
        }
        $data = [
            'iat'  => $issuedAt->getTimestamp(),
            'jti'  => base64_encode(random_bytes(16)),
            'iss'  => SERVER_NAME,
            'nbf'  => $issuedAt->getTimestamp(),
            'exp'  => $expireAt->getTimestamp(),
            'data' => $payload
        ];
        return JWT::encode($data, SECRET_KEY, 'HS512');
    }

    public function getPayload($token)
    {
        JWT::$leeway += 60;
        return JWT::decode((string)$token, SECRET_KEY, ['HS512']);
    }

    public function extractToken()
    {
        $this->_hasToken = false;
        $this->_token = null;
        $this->_headerError = '';
        $this->_reason = '';

        if (!preg_match('/Bearer\s(\S+)/', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            $this->_headerError = 'HTTP/1.0 400 Bad Request';
            $this->_reason = "Token not found in request";
            return false;
        }

        $jwt = $matches[1];
        if (!$jwt) {
            $this->_headerError = 'HTTP/1.0 400 Bad Request';
            $this->_reason = "Token not found in request";
            return false;
        }

        $this->_token = $this->getPayload($jwt);
        $now = new DateTimeImmutable();
        if (
            $this->_token->iss !== SERVER_NAME ||
            $this->_token->nbf > $now->getTimestamp() ||
            $this->_token->exp < $now->getTimestamp()
        ) {
            $this->_headerError = 'HTTP/1.1 401 Unauthorized';
            $this->_reason = "Token expired or incorrect server name";
            return false;
        }

        $this->_hasToken = true;
        return true;
    }

    public function getHeaderError()
    {
        return $this->_headerError;
    }

    public function getErrorReason()
    {
        return $this->_reason;
    }

    public function hasToken()
    {
        return $this->_hasToken;
    }

    /**
     * @return stdObject
     */
    public function getToken()
    {
        return $this->_token;
    }
}
