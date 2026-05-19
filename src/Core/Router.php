<?php
declare(strict_types=1);

namespace App\Core;

class Router
{
    private array $routes = [];

    public function get(string $path, string $handler): void    { $this->add('GET',    $path, $handler); }
    public function post(string $path, string $handler): void   { $this->add('POST',   $path, $handler); }
    public function put(string $path, string $handler): void    { $this->add('PUT',    $path, $handler); }
    public function delete(string $path, string $handler): void { $this->add('DELETE', $path, $handler); }

    private function add(string $method, string $path, string $handler): void
    {
        $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $path);
        $this->routes[] = compact('method', 'path', 'pattern', 'handler');
    }

    public function dispatch(Request $request): void
    {
        header('Access-Control-Allow-Origin: ' . ($_ENV['APP_URL'] ?? '*'));
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');

        if ($request->method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        // Strip leading api/ from path so routes can be defined without it
        $path = preg_replace('#^api/#', '', $request->path);

        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) continue;
            if (!preg_match('#^' . $route['pattern'] . '$#u', $path, $matches)) continue;

            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

            [$class, $method] = explode('@', $route['handler']);
            (new $class($request, $params))->{$method}();
            return;
        }

        Response::notFound('Route not found: ' . $request->method . ' /' . $path);
    }
}
