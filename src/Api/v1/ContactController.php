<?php
declare(strict_types=1);

namespace App\Api\v1;

use App\Core\Controller;
use App\Core\Response;
use App\Services\MailService;

class ContactController extends Controller
{
    public function send(): void
    {
        if (!$this->request->isPost()) {
            Response::error('Method not allowed', 405);
        }

        // Honeypot
        if (!empty($this->request->input('website'))) {
            Response::success();
        }

        $errors = $this->validate([
            'name'  => 'required|min:2|max:100',
            'phone' => 'required|phone',
        ]);

        $email   = trim((string) $this->request->input('email', ''));
        $message = trim((string) $this->request->input('message', ''));

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Некорректный e-mail';
        }
        if (mb_strlen($message) > 2000) {
            $errors['message'] = 'Сообщение слишком длинное (максимум 2000 символов)';
        }

        if ($errors) {
            Response::validationError($errors);
        }

        $sent = MailService::sendContactNotification([
            'name'    => $this->request->input('name'),
            'phone'   => $this->request->input('phone'),
            'email'   => $email,
            'message' => $message,
            'ip'      => $_SERVER['REMOTE_ADDR'] ?? '—',
        ]);

        if ($sent) {
            Response::success(['message' => 'Заявка принята, скоро с вами свяжемся']);
        } else {
            Response::error('Ошибка отправки, попробуйте позже', 500);
        }
    }
}
