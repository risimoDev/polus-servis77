<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

class CsrfMiddleware
{
    public static function generateToken(): string
    {
        if (session_status() === PHP_SESSION_NONE) session_start();

        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }

    public static function verify(Request $request): void
    {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $token  = $request->header('X-CSRF-Token')
               ?? $request->input('_token', '');
        $stored = $_SESSION['csrf_token'] ?? '';

        if (!hash_equals($stored, (string) $token)) {
            Response::forbidden('CSRF token mismatch');
        }
    }
}
