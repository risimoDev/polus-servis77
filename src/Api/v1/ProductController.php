<?php
declare(strict_types=1);

namespace App\Api\v1;

use App\Core\Controller;
use App\Core\Response;
use App\Models\Product;

class ProductController extends Controller
{
    public function index(): void
    {
        $page    = max(1, (int) $this->request->input('page', 1));
        $perPage = min(100, max(1, (int) $this->request->input('per_page', 20)));

        $search     = $this->request->input('search', '');
        $categoryId = $this->request->input('category_id');

        if ($search) {
            Response::success(['data' => Product::search($search, $perPage)]);
        } elseif ($categoryId) {
            Response::success(['data' => Product::byCategory((int) $categoryId, $page, $perPage)]);
        } else {
            Response::success(Product::paginate($page, $perPage));
        }
    }

    public function show(): void
    {
        $id      = (int) ($this->params['id'] ?? 0);
        $product = Product::find($id);

        if (!$product) {
            Response::notFound('Товар не найден');
        }

        Response::success(['product' => $product]);
    }

    public function store(): void
    {
        // TODO: require admin role
        $errors = $this->validate([
            'name'        => 'required|min:2|max:300',
            'price'       => 'required|numeric',
            'category_id' => 'numeric',
        ]);

        if ($errors) {
            Response::validationError($errors);
        }

        $id = Product::create([
            'category_id' => $this->request->input('category_id'),
            'name'        => $this->request->input('name'),
            'slug'        => $this->request->input('slug', ''),
            'description' => $this->request->input('description', ''),
            'price'       => $this->request->input('price'),
            'stock'       => $this->request->input('stock', 0),
            'is_active'   => 1,
        ]);

        Response::success(['id' => $id], 201);
    }

    public function update(): void
    {
        $id = (int) ($this->params['id'] ?? 0);
        if (!Product::find($id)) {
            Response::notFound('Товар не найден');
        }

        // TODO: require admin role, selective update
        Response::error('Not implemented', 501);
    }

    public function destroy(): void
    {
        $id = (int) ($this->params['id'] ?? 0);
        if (!Product::find($id)) {
            Response::notFound('Товар не найден');
        }

        // TODO: require admin role
        Product::delete($id);
        Response::success();
    }
}
