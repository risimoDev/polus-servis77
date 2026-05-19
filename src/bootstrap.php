<?php
declare(strict_types=1);

// PSR-4 autoloader — used when Composer is not installed
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else {
    spl_autoload_register(function (string $class): void {
        $path = __DIR__ . '/' . str_replace(['App\\', '\\'], ['', '/'], $class) . '.php';
        if (file_exists($path)) {
            require_once $path;
        }
    });
}

// Parse .env
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
        putenv(trim($key) . '=' . trim($value));
    }
}

// Error handling
$debug = ($_ENV['APP_DEBUG'] ?? 'false') === 'true';
ini_set('display_errors', $debug ? '1' : '0');
error_reporting(E_ALL);

if (!$debug) {
    set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline): bool {
        error_log("[{$errno}] {$errstr} in {$errfile}:{$errline}");
        return true;
    });
    set_exception_handler(function (\Throwable $e): void {
        error_log($e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Internal server error']);
        exit;
    });
}

date_default_timezone_set('Asia/Yekaterinburg');
