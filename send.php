<?php
/**
 * Полюс Сервис 77 — Form handler
 * Requirements: PHP 7.4+, mail() configured on server (or swap to PHPMailer/SMTP)
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Only accept AJAX POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_SERVER['HTTP_X_REQUESTED_WITH'])) {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// ── CONFIG ──────────────────────────────────────────────────────
const TO_EMAIL   = 'help@polus-servis77.ru';
const FROM_EMAIL = 'noreply@polus-servis77.ru';
const SITE_NAME  = 'Полюс Сервис 77';
// ────────────────────────────────────────────────────────────────

function sanitize(string $input): string {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function validatePhone(string $phone): bool {
    return (bool) preg_match('/^\+?[\d\s\-\(\)]{10,20}$/', $phone);
}

function validateEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// ── INPUT ────────────────────────────────────────────────────────
$name    = sanitize($_POST['name']    ?? '');
$phone   = sanitize($_POST['phone']   ?? '');
$email   = sanitize($_POST['email']   ?? '');
$message = sanitize($_POST['message'] ?? '');

// ── VALIDATION ──────────────────────────────────────────────────
$errors = [];

if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
    $errors[] = 'Некорректное имя';
}
if (!validatePhone($phone)) {
    $errors[] = 'Некорректный телефон';
}
if ($email !== '' && !validateEmail($email)) {
    $errors[] = 'Некорректный e-mail';
}
if (mb_strlen($message) > 2000) {
    $errors[] = 'Сообщение слишком длинное';
}

if ($errors) {
    http_response_code(422);
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

// ── SPAM HONEYPOT (add hidden input name="website" to form if needed) ──
if (!empty($_POST['website'])) {
    echo json_encode(['success' => true]);
    exit;
}

// ── BUILD EMAIL ──────────────────────────────────────────────────
$subject = '[' . SITE_NAME . '] Новая заявка с сайта — ' . $name;

$body  = "Новая заявка с сайта " . SITE_NAME . "\n";
$body .= str_repeat('─', 40) . "\n\n";
$body .= "Имя:       {$name}\n";
$body .= "Телефон:   {$phone}\n";
if ($email) {
    $body .= "E-mail:    {$email}\n";
}
if ($message) {
    $body .= "\nСообщение:\n{$message}\n";
}
$body .= "\n" . str_repeat('─', 40) . "\n";
$body .= "Дата:      " . date('d.m.Y H:i:s') . "\n";
$body .= "IP:        " . ($_SERVER['REMOTE_ADDR'] ?? '—') . "\n";

$headers  = "From: " . SITE_NAME . " <" . FROM_EMAIL . ">\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . PHP_VERSION . "\r\n";

// ── SEND ─────────────────────────────────────────────────────────
$sent = mail(TO_EMAIL, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    error_log('mail() failed for ' . TO_EMAIL);
    echo json_encode(['success' => false, 'message' => 'Ошибка отправки, попробуйте позже']);
}
