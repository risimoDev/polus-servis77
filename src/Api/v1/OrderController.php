<?php
declare(strict_types=1);

namespace App\Api\v1;

use App\Core\Controller;
use App\Core\Response;
use App\Models\Order;
use App\Services\MailService;

class OrderController extends Controller
{
    public function index(): void
    {
        // TODO: require auth, return user's own orders or all if admin
        Response::error('Not implemented', 501);
    }

    public function store(): void
    {
        $errors = $this->validate([
            'name'  => 'required|min:2|max:100',
            'phone' => 'required|phone',
        ]);

        $email = trim((string) $this->request->input('email', ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Некорректный e-mail';
        }

        $items = $this->request->input('items', []);
        if (empty($items) || !is_array($items)) {
            $errors['items'] = 'Корзина пуста';
        }

        if ($errors) {
            Response::validationError($errors);
        }

        // TODO: validate items against DB, calculate total server-side
        // TODO: integrate Yookassa payment

        Response::error('Оформление заказов в разработке', 501);
    }

    public function show(): void
    {
        $id    = (int) ($this->params['id'] ?? 0);
        $order = Order::find($id);

        if (!$order) {
            Response::notFound('Заказ не найден');
        }

        // TODO: check ownership / admin role before returning
        Response::success(['order' => $order]);
    }

    public function update(): void
    {
        // TODO: admin only — update status
        $id = (int) ($this->params['id'] ?? 0);
        if (!Order::find($id)) {
            Response::notFound('Заказ не найден');
        }

        $status = $this->request->input('status', '');
        $allowed = [Order::STATUS_NEW, Order::STATUS_CONFIRMED, Order::STATUS_SHIPPING, Order::STATUS_DONE, Order::STATUS_CANCELLED];
        if (!in_array($status, $allowed, true)) {
            Response::error('Некорректный статус');
        }

        Order::updateStatus($id, $status);
        Response::success();
    }
}
