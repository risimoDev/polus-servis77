<?php
declare(strict_types=1);

namespace App\Config;

class App
{
    public static function get(string $key, mixed $default = null): mixed
    {
        return $_ENV[$key] ?? $default;
    }

    public static function env(): string
    {
        return self::get('APP_ENV', 'production');
    }

    public static function debug(): bool
    {
        return self::get('APP_DEBUG', 'false') === 'true';
    }

    public static function url(): string
    {
        return rtrim(self::get('APP_URL', 'https://polus-servis77.ru'), '/');
    }

    public static function key(): string
    {
        return self::get('APP_KEY', '');
    }
}
