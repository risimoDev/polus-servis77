<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

class Order extends Model
{
    protected static string $table      = 'orders';
    protected static string $primaryKey = 'id';
    protected static array  $fillable   = [
        'user_id', 'name', 'phone', 'email', 'address',
        'items', 'total', 'status', 'payment_id', 'notes', 'updated_at',
    ];

    const STATUS_NEW       = 'new';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_SHIPPING  = 'shipping';
    const STATUS_DONE      = 'done';
    const STATUS_CANCELLED = 'cancelled';

    public static function byUser(int $userId): array
    {
        return static::where('user_id', $userId);
    }

    public static function updateStatus(int $id, string $status): bool
    {
        return static::update($id, [
            'status'     => $status,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
