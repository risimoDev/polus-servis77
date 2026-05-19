<?php
declare(strict_types=1);

namespace App\Api\v1;

use App\Core\Controller;
use App\Core\Response;
use App\Services\AuthService;

class AuthController extends Controller
{
    public function login(): void
    {
        $errors = $this->validate([
            'email'    => 'required|email',
            'password' => 'required|min:6',
        ]);

        if ($errors) {
            Response::validationError($errors);
        }

        $result = AuthService::login(
            (string) $this->request->input('email'),
            (string) $this->request->input('password')
        );

        if (!$result) {
            Response::error('Неверный e-mail или пароль', 401);
        }

        Response::success(['token' => $result['token'], 'user' => $result['user']]);
    }

    public function register(): void
    {
        $errors = $this->validate([
            'name'     => 'required|min:2|max:100',
            'email'    => 'required|email',
            'password' => 'required|min:8',
            'phone'    => 'phone',
        ]);

        if ($errors) {
            Response::validationError($errors);
        }

        // TODO: implement registration
        Response::error('Регистрация временно недоступна', 501);
    }

    public function logout(): void
    {
        // TODO: invalidate token in sessions table
        Response::success();
    }

    public function me(): void
    {
        // TODO: verify token and return current user
        Response::error('Not implemented', 501);
    }
}
