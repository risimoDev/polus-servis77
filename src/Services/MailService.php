<?php
declare(strict_types=1);

namespace App\Services;

use App\Config\Mail;

class MailService
{
    public static function sendContactNotification(array $data): bool
    {
        $cfg     = Mail::config();
        $name    = $data['name'];
        $subject = '[Полюс Сервис 77] Новая заявка — ' . $name;

        $body  = "Новая заявка с сайта Полюс Сервис 77\n";
        $body .= str_repeat('─', 40) . "\n\n";
        $body .= "Имя:       {$name}\n";
        $body .= "Телефон:   {$data['phone']}\n";
        if (!empty($data['email'])) {
            $body .= "E-mail:    {$data['email']}\n";
        }
        if (!empty($data['message'])) {
            $body .= "\nСообщение:\n{$data['message']}\n";
        }
        $body .= "\n" . str_repeat('─', 40) . "\n";
        $body .= "Дата:      " . date('d.m.Y H:i:s') . "\n";
        $body .= "IP:        {$data['ip']}\n";

        $replyTo = !empty($data['email']) ? $data['email'] : $cfg['from_addr'];

        $headers  = "From: {$cfg['from_name']} <{$cfg['from_addr']}>\r\n";
        $headers .= "Reply-To: {$replyTo}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP/" . PHP_VERSION . "\r\n";

        return mail(
            $cfg['to'],
            '=?UTF-8?B?' . base64_encode($subject) . '?=',
            $body,
            $headers
        );
    }

    public static function sendOrderConfirmation(array $order): bool
    {
        // TODO: implement HTML email template with order details
        return false;
    }

    public static function sendPasswordReset(string $email, string $token): bool
    {
        // TODO: implement password reset email
        return false;
    }
}
