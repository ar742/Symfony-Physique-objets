<?php

namespace App\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

final class LegacyExtension extends AbstractExtension
{
    public function getFilters(): array
    {
        return [new TwigFilter('web_url', [$this, 'webUrl'])];
    }

    public function webUrl(?string $value): ?string
    {
        $value = trim($value ?? '');
        if (!filter_var($value, FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($value, PHP_URL_SCHEME) ?? ''), ['http', 'https'], true)) {
            return null;
        }

        return $value;
    }
}
