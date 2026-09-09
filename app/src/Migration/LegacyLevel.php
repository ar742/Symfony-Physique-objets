<?php

namespace App\Migration;

final class LegacyLevel
{
    /** @return array{int, int} */
    public static function decode(string $value): array
    {
        // This export uses exactly two single-digit string coordinates; no PHP objects are deserialized.
        if (!preg_match('/\Aa:2:\{i:0;s:1:"([1-6])";i:1;s:1:"([0-6])";\}\z/', $value, $matches)) {
            throw new \UnexpectedValueException('Coordonnées historiques de niveau non reconnues.');
        }

        return [(int) $matches[1], (int) $matches[2]];
    }
}
