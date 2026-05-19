<?php
declare(strict_types=1);

namespace App\Config;

class Mail
{
    public static function config(): array
    {
        return [
            'host'      => App::get('MAIL_HOST', 'localhost'),
            'port'      => (int) App::get('MAIL_PORT', '587'),
            'user'      => App::get('MAIL_USER', ''),
            'pass'      => App::get('MAIL_PASS', ''),
            'from_name' => App::get('MAIL_FROM_NAME', 'Полюс Сервис 77'),
            'from_addr' => App::get('MAIL_USER', 'noreply@polus-servis77.ru'),
            'to'        => App::get('MAIL_TO', 'help@polus-servis77.ru'),
        ];
    }
}
