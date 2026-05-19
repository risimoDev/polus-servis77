<?php
declare(strict_types=1);

namespace App\Services;

use App\Models\User;

class AuthService
{
    public static function login(string $email, string $password): ?array
    {
        $user = User::findByEmail($email);
        if (!$user) return null;
        if (!password_verify($password, $user['password_hash'])) return null;

        $token = bin2hex(random_bytes(32));
        // TODO: persist token to sessions table with expiry + user_agent + ip

        unset($user['password_hash']);
        return ['token' => $token, 'user' => $user];
    }

    public static function register(array $data): ?array
    {
        $existing = User::findByEmail($data['email']);
        if ($existing) return null;

        $id = User::create([
            'name'          => $data['name'],
            'email'         => strtolower(trim($data['email'])),
            'password_hash' => password_hash($data['password'], PASSWORD_BCRYPT),
            'phone'         => $data['phone'] ?? null,
            'role'          => 'user',
        ]);

        // TODO: send verification email

        return User::find($id);
    }

    public static function verify(string $token): ?array
    {
        // TODO: look up token in sessions table, check expiry
        // Return user array or null if invalid/expired
        return null;
    }

    public static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
}
