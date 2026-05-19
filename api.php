<?php
declare(strict_types=1);

require_once __DIR__ . '/src/bootstrap.php';

use App\Core\Router;
use App\Core\Request;

$router  = new Router();
$request = Request::capture();

// ── Contact form ─────────────────────────────────────────────────
$router->post('contact', 'App\Api\v1\ContactController@send');

// ── Products & catalog ───────────────────────────────────────────
$router->get( 'products',        'App\Api\v1\ProductController@index');
$router->get( 'products/{id}',   'App\Api\v1\ProductController@show');
$router->post('products',        'App\Api\v1\ProductController@store');
$router->put( 'products/{id}',   'App\Api\v1\ProductController@update');
$router->delete('products/{id}', 'App\Api\v1\ProductController@destroy');

// ── Categories ───────────────────────────────────────────────────
$router->get( 'categories',      'App\Api\v1\CategoryController@index');
$router->get( 'categories/{id}', 'App\Api\v1\CategoryController@show');

// ── Auth ─────────────────────────────────────────────────────────
$router->post('auth/login',    'App\Api\v1\AuthController@login');
$router->post('auth/register', 'App\Api\v1\AuthController@register');
$router->post('auth/logout',   'App\Api\v1\AuthController@logout');
$router->get( 'auth/me',       'App\Api\v1\AuthController@me');

// ── Orders ───────────────────────────────────────────────────────
$router->get( 'orders',      'App\Api\v1\OrderController@index');
$router->post('orders',      'App\Api\v1\OrderController@store');
$router->get( 'orders/{id}', 'App\Api\v1\OrderController@show');
$router->put( 'orders/{id}', 'App\Api\v1\OrderController@update');

// ── Forum ────────────────────────────────────────────────────────
$router->get( 'forum/threads',              'App\Api\v1\ForumController@threads');
$router->post('forum/threads',              'App\Api\v1\ForumController@createThread');
$router->get( 'forum/threads/{id}',         'App\Api\v1\ForumController@thread');
$router->post('forum/threads/{id}/replies', 'App\Api\v1\ForumController@reply');

// ── Dispatch ─────────────────────────────────────────────────────
$router->dispatch($request);
