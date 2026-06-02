<?php

/**
 * Lightweight JWT implementation without external dependencies.
 * Supports HS256, HS384, HS512.
 */
class JWTUtils
{
    private bool $_hasToken = false;
    private ?object $_token = null;
    private string $_headerError = '';
    private string $_reason = '';

    /**
     * Base64 URL-safe encode
     */
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL-safe decode
     */
    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Create a JWT token
     */
    public function createToken(
        array $payload,
        ?DateTimeImmutable $issuedAt = null,
        ?DateTimeImmutable $expireAt = null,
        string $algorithm = 'HS256'
    ): string {
        if ($issuedAt === null) {
            $issuedAt = new DateTimeImmutable();
        }
        if ($expireAt === null) {
            $expireAt = $issuedAt->modify('+60 minutes');
        }

        $header = [
            'alg' => $algorithm,
            'typ' => 'JWT'
        ];

        $data = [
            'iat'  => $issuedAt->getTimestamp(),
            'jti'  => bin2hex(random_bytes(16)),
            'iss'  => SERVER_NAME,
            'nbf'  => $issuedAt->getTimestamp(),
            'exp'  => $expireAt->getTimestamp(),
            'data' => $payload
        ];

        $segments = [];
        $segments[] = self::base64UrlEncode(json_encode($header));
        $segments[] = self::base64UrlEncode(json_encode($data));

        $signingInput = implode('.', $segments);
        $signature = self::sign($signingInput, SECRET_KEY, $algorithm);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * Sign a string with a key using a given algorithm
     */
    private static function sign(string $input, string $secret, string $algorithm): string
    {
        $algMap = [
            'HS256' => 'sha256',
            'HS384' => 'sha384',
            'HS512' => 'sha512',
        ];

        if (!isset($algMap[$algorithm])) {
            throw new InvalidArgumentException("Unsupported algorithm: $algorithm");
        }

        return hash_hmac($algMap[$algorithm], $input, $secret, true);
    }

    /**
     * Decode and verify a JWT token
     */
    public function decode(string $token): object
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new InvalidArgumentException('Wrong number of segments');
        }

        list($headB64, $bodyB64, $sigB64) = $parts;

        $header = json_decode(self::base64UrlDecode($headB64));
        if ($header === null) {
            throw new InvalidArgumentException('Invalid header encoding');
        }

        $payload = json_decode(self::base64UrlDecode($bodyB64));
        if ($payload === null) {
            throw new InvalidArgumentException('Invalid claims encoding');
        }

        // Verify signature
        $signingInput = "$headB64.$bodyB64";
        $sig = self::base64UrlDecode($sigB64);
        $expectedSig = self::sign($signingInput, SECRET_KEY, $header->alg);

        if (!hash_equals($expectedSig, $sig)) {
            throw new InvalidArgumentException('Signature verification failed');
        }

        return $payload;
    }

    /**
     * Extract and validate token from the Authorization header
     */
    public function extractToken(): bool
    {
        $this->_hasToken = false;
        $this->_token = null;
        $this->_headerError = '';
        $this->_reason = '';

        // Check for Authorization header
        $authHeader = '';
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (isset($headers['Authorization'])) {
                $authHeader = $headers['Authorization'];
            } elseif (isset($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }

        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
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

        try {
            $this->_token = $this->decode($jwt);
        } catch (Exception $e) {
            $this->_headerError = 'HTTP/1.1 401 Unauthorized';
            $this->_reason = "Invalid token: " . $e->getMessage();
            return false;
        }

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

    public function getHeaderError(): string
    {
        return $this->_headerError;
    }

    public function getErrorReason(): string
    {
        return $this->_reason;
    }

    public function hasToken(): bool
    {
        return $this->_hasToken;
    }

    /**
     * @return ?object
     */
    public function getToken(): ?object
    {
        return $this->_token;
    }
}