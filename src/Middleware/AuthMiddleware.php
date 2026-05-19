<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Services\AuthService;

class AuthMiddleware
{
    public static function handle(Request $request): array
    {
        $header = (string) $request->header('Authorization', '');
        if (!str_starts_with($header, 'Bearer ')) {
            Response::unauthorized('Требуется авторизация');
        }

        $token = substr($header, 7);
        $user  = AuthService::verify($token);

        if (!$user) {
            Response::unauthorized('Токен недействителен или истёк');
        }

        return $user;
    }

    public static function admin(Request $request): array
    {
        $user = self::handle($request);

        if ($user['role'] !== 'admin') {
            Response::forbidden('Недостаточно прав');
        }

        return $user;
    }

    public static function manager(Request $request): array
    {
        $user = self::handle($request);

        if (!in_array($user['role'], ['admin', 'manager'], true)) {
            Response::forbidden('Недостаточно прав');
        }

        return $user;
    }
}
