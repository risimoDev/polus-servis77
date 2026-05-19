<?php
declare(strict_types=1);

namespace App\Core;

use App\Config\Database;
use PDO;

abstract class Model
{
    protected static string $table      = '';
    protected static string $primaryKey = 'id';
    protected static array  $fillable   = [];

    protected static function db(): PDO
    {
        return Database::connection();
    }

    public static function find(int $id): ?array
    {
        $t    = static::$table;
        $pk   = static::$primaryKey;
        $stmt = static::db()->prepare("SELECT * FROM `{$t}` WHERE `{$pk}` = ? LIMIT 1");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function all(int $limit = 100, int $offset = 0): array
    {
        $t    = static::$table;
        $pk   = static::$primaryKey;
        $stmt = static::db()->prepare("SELECT * FROM `{$t}` ORDER BY `{$pk}` DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll();
    }

    public static function where(string $column, mixed $value): array
    {
        $t    = static::$table;
        $stmt = static::db()->prepare("SELECT * FROM `{$t}` WHERE `{$column}` = ?");
        $stmt->execute([$value]);
        return $stmt->fetchAll();
    }

    public static function create(array $data): int
    {
        $data  = array_intersect_key($data, array_flip(static::$fillable));
        $t     = static::$table;
        $cols  = '`' . implode('`, `', array_keys($data)) . '`';
        $phs   = implode(', ', array_fill(0, count($data), '?'));
        $stmt  = static::db()->prepare("INSERT INTO `{$t}` ({$cols}) VALUES ({$phs})");
        $stmt->execute(array_values($data));
        return (int) static::db()->lastInsertId();
    }

    public static function update(int $id, array $data): bool
    {
        $data  = array_intersect_key($data, array_flip(static::$fillable));
        $t     = static::$table;
        $pk    = static::$primaryKey;
        $set   = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($data)));
        $stmt  = static::db()->prepare("UPDATE `{$t}` SET {$set} WHERE `{$pk}` = ?");
        return $stmt->execute([...array_values($data), $id]);
    }

    public static function delete(int $id): bool
    {
        $t    = static::$table;
        $pk   = static::$primaryKey;
        $stmt = static::db()->prepare("DELETE FROM `{$t}` WHERE `{$pk}` = ?");
        return $stmt->execute([$id]);
    }

    public static function paginate(int $page = 1, int $perPage = 20): array
    {
        $t      = static::$table;
        $pk     = static::$primaryKey;
        $offset = ($page - 1) * $perPage;

        $total = (int) static::db()->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();

        $stmt = static::db()->prepare("SELECT * FROM `{$t}` ORDER BY `{$pk}` DESC LIMIT ? OFFSET ?");
        $stmt->execute([$perPage, $offset]);

        return [
            'data'     => $stmt->fetchAll(),
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) ceil($total / max(1, $perPage)),
        ];
    }
}
