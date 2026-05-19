<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

class Category extends Model
{
    protected static string $table      = 'categories';
    protected static string $primaryKey = 'id';
    protected static array  $fillable   = [
        'parent_id', 'name', 'slug', 'description', 'image', 'sort_order',
    ];

    public static function tree(): array
    {
        $all    = static::all(1000, 0);
        $lookup = [];
        $tree   = [];

        foreach ($all as &$cat) {
            $cat['children']  = [];
            $lookup[$cat['id']] = &$cat;
        }
        unset($cat);

        foreach ($lookup as &$cat) {
            $pid = $cat['parent_id'];
            if ($pid && isset($lookup[$pid])) {
                $lookup[$pid]['children'][] = &$cat;
            } else {
                $tree[] = &$cat;
            }
        }

        return $tree;
    }
}
