<?php
declare(strict_types=1);

namespace App\Core;

abstract class Controller
{
    protected Request $request;
    protected array   $params;

    public function __construct(Request $request, array $params = [])
    {
        $this->request = $request;
        $this->params  = $params;
    }

    protected function validate(array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $ruleStr) {
            $value = $this->request->input($field);

            foreach (explode('|', $ruleStr) as $r) {
                [$name, $param] = array_pad(explode(':', $r, 2), 2, null);
                $error = $this->applyRule($name, $param, $field, $value);
                if ($error !== null) {
                    $errors[$field] = $error;
                    break;
                }
            }
        }

        return $errors;
    }

    private function applyRule(string $rule, ?string $param, string $field, mixed $value): ?string
    {
        $str = (string) ($value ?? '');

        return match ($rule) {
            'required' => (trim($str) === '') ? "Поле {$field} обязательно" : null,
            'min'      => mb_strlen($str) < (int) $param ? "Минимум {$param} символов" : null,
            'max'      => mb_strlen($str) > (int) $param ? "Максимум {$param} символов" : null,
            'email'    => !filter_var($str, FILTER_VALIDATE_EMAIL) ? 'Некорректный e-mail' : null,
            'phone'    => !preg_match('/^\+?[\d\s\-\(\)]{10,20}$/', $str) ? 'Некорректный телефон' : null,
            'numeric'  => !is_numeric($str) ? "Поле {$field} должно быть числом" : null,
            'url'      => !filter_var($str, FILTER_VALIDATE_URL) ? 'Некорректная ссылка' : null,
            default    => null,
        };
    }
}
