<?php

namespace App\Content;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class CardAnalysisLibrary
{
    private ?array $analyses = null;

    public function __construct(#[Autowire('%kernel.project_dir%')] private readonly string $projectDir) {}

    public function stages(): array
    {
        return [
            1 => ['label' => 'Exp. IN', 'name' => 'Expression du système', 'color' => 'blue'],
            2 => ['label' => 'TH', 'name' => 'Formalisation d’entrée', 'color' => 'orange'],
            3 => ['label' => 'Exp. OUT', 'name' => 'Résultats d’entrée', 'color' => 'green'],
            4 => ['label' => 'Retour · Exp. IN', 'name' => 'Relecture des résultats', 'color' => 'blue'],
            5 => ['label' => 'Retour · TH', 'name' => 'Confrontation théorique', 'color' => 'orange'],
            6 => ['label' => 'Retour · Exp. OUT', 'name' => 'Résultats de retour', 'color' => 'green'],
        ];
    }

    public function all(): array
    {
        if ($this->analyses !== null) { return $this->analyses; }
        $analyses = json_decode(file_get_contents($this->projectDir.'/config/content/analyses-fiches.json'), true, flags: JSON_THROW_ON_ERROR);
        $stages = $this->stages();
        foreach ($analyses as &$analysis) {
            foreach ($analysis['levels'] as &$level) {
                $level += $stages[$level['id']];
                $level['coordinate'] = $level['id'].'.0';
                $level['subtitle'] = $level['label'];
                $level['tip'] = $level['system'];
                foreach ($level['steps'] as &$step) {
                    $step += $stages[$step['id']];
                    $step['coordinate'] = $level['id'].'.'.$step['id'];
                    $step['subtitle'] = $step['label'];
                    $step['tip'] = $step['action'];
                }
                unset($step);
            }
            unset($level);
        }
        unset($analysis);
        return $this->analyses = $analyses;
    }

    public function find(string $slug): ?array
    {
        return $this->all()[$slug] ?? null;
    }
}
