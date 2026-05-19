<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

class Product extends Model
{
    protected static string $table      = 'products';
    protected static string $primaryKey = 'id';
    protected static array  $fillable   = [
        'category_id', 'name', 'slug', 'description',
        'price', 'old_price', 'stock', 'images', 'specs', 'is_active',
    ];

    public static function byCategory(int $categoryId, int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;
        $stmt   = static::db()->prepare(
            'SELECT * FROM products WHERE category_id = ? AND is_active = 1
             ORDER BY created_at DESC LIMIT ? OFFSET ?'
        );
        $stmt->execute([$categoryId, $perPage, $offset]);
        return $stmt->fetchAll();
    }

    public static function search(string $query, int $limit = 20): array
    {
        $like = '%' . $query . '%';
        $stmt = static::db()->prepare(
            'SELECT * FROM products WHERE is_active = 1
             AND (name LIKE ? OR description LIKE ?) LIMIT ?'
        );
        $stmt->execute([$like, $like, $limit]);
        return $stmt->fetchAll();
    }
}
