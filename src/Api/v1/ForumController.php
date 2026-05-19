<?php
declare(strict_types=1);

namespace App\Api\v1;

use App\Core\Controller;
use App\Core\Response;

class ForumController extends Controller
{
    public function threads(): void
    {
        // TODO: return paginated list of forum threads
        Response::error('Форум в разработке', 501);
    }

    public function createThread(): void
    {
        $errors = $this->validate([
            'title' => 'required|min:5|max:300',
            'body'  => 'required|min:10',
        ]);

        if ($errors) {
            Response::validationError($errors);
        }

        // TODO: require auth, create thread
        Response::error('Форум в разработке', 501);
    }

    public function thread(): void
    {
        // TODO: return thread with replies
        Response::error('Форум в разработке', 501);
    }

    public function reply(): void
    {
        $errors = $this->validate([
            'body' => 'required|min:2',
        ]);

        if ($errors) {
            Response::validationError($errors);
        }

        // TODO: require auth, create reply
        Response::error('Форум в разработке', 501);
    }
}
