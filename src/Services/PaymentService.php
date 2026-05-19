<?php
declare(strict_types=1);

namespace App\Services;

use App\Config\App;

/**
 * Yookassa payment integration.
 * API docs: https://yookassa.ru/developers/api
 */
class PaymentService
{
    private const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';

    public static function createPayment(array $order, string $returnUrl): ?array
    {
        $shopId = App::get('PAYMENT_YOOKASSA_SHOP_ID');
        $secret = App::get('PAYMENT_YOOKASSA_SECRET');

        if (!$shopId || !$secret) {
            error_log('PaymentService: Yookassa credentials not set in .env');
            return null;
        }

        $idempotenceKey = bin2hex(random_bytes(16));

        $payload = [
            'amount'      => ['value' => number_format((float)$order['total'], 2, '.', ''), 'currency' => 'RUB'],
            'capture'     => true,
            'confirmation'=> ['type' => 'redirect', 'return_url' => $returnUrl],
            'description' => 'Заказ №' . $order['id'],
            'metadata'    => ['order_id' => $order['id']],
        ];

        $response = self::httpPost(self::YOOKASSA_API, $payload, $shopId, $secret, $idempotenceKey);
        if (!$response) return null;

        return $response;
    }

    public static function handleWebhook(array $payload): void
    {
        $event   = $payload['event'] ?? '';
        $object  = $payload['object'] ?? [];
        $orderId = (int) ($object['metadata']['order_id'] ?? 0);

        match ($event) {
            'payment.succeeded' => self::onPaymentSucceeded($orderId, $object),
            'payment.canceled'  => self::onPaymentCancelled($orderId, $object),
            'refund.succeeded'  => self::onRefundSucceeded($orderId, $object),
            default             => null,
        };
    }

    private static function onPaymentSucceeded(int $orderId, array $payment): void
    {
        // TODO: update order status to confirmed, send confirmation email
    }

    private static function onPaymentCancelled(int $orderId, array $payment): void
    {
        // TODO: update order status to cancelled
    }

    private static function onRefundSucceeded(int $orderId, array $refund): void
    {
        // TODO: handle refund
    }

    private static function httpPost(string $url, array $data, string $shopId, string $secret, string $idempotenceKey): ?array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_USERPWD        => "{$shopId}:{$secret}",
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Idempotence-Key: ' . $idempotenceKey,
            ],
            CURLOPT_TIMEOUT => 15,
        ]);

        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false || $status < 200 || $status >= 300) {
            error_log("PaymentService: HTTP {$status} — {$body}");
            return null;
        }

        return json_decode((string) $body, true) ?? null;
    }
}
