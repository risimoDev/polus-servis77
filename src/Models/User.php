<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

class User extends Model
{
    protected static string $table      = 'users';
    protected static string $primaryKey = 'id';
    protected static array  $fillable   = [
        'name', 'email', 'password_hash', 'phone',
        'role', 'email_verified_at',
    ];

    public static function findByEmail(string $email): ?array
    {
        $stmt = static::db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([strtolower(trim($email))]);
        return $stmt->fetch() ?: null;
    }

    public static function isAdmin(array $user): bool
    {
        return $user['role'] === 'admin';
    }

    public static function isManager(array $user): bool
    {
        return in_array($user['role'], ['admin', 'manager'], true);
    }
}
