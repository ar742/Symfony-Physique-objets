<?php

namespace App\Content;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class LoopGuide
{
    public function __construct(#[Autowire('%kernel.project_dir%')] private readonly string $projectDir, private readonly SourceLibrary $sources) {}

    public function steps(): array
    {
        $steps = json_decode(file_get_contents($this->projectDir.'/config/content/boucle.json'), true, flags: JSON_THROW_ON_ERROR);
        foreach ($steps as &$step) {
            foreach ($step['sources'] as &$source) {
                $entry = $this->sources->entry($source['doc'], $source['code']) ?? throw new \LogicException('Repère de recueil introuvable.');
                $source['page'] = $entry['page'];
            }
            unset($source);
        }
        unset($step);
        return $steps;
    }

    public function subloops(): array
    {
        return json_decode(file_get_contents($this->projectDir.'/config/content/sous-boucles.json'), true, flags: JSON_THROW_ON_ERROR);
    }

    public function subloop(int $base): ?array
    {
        foreach ($this->subloops() as $loop) {
            if ($loop['base'] === $base) {
                return $loop;
            }
        }
        return null;
    }

    public function locationsFor(string $slug): array
    {
        $locations = [];
        foreach ($this->subloops() as $loop) {
            foreach ($loop['steps'] as $step) {
                if ($step['card'] === $slug) {
                    $locations[] = ['base' => $loop['base']] + $step;
                }
            }
        }
        return $locations;
    }
}
