<?php

namespace App\Content;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class AnalysisFormatLibrary
{
    private ?array $formats = null;

    public function __construct(
        #[Autowire('%kernel.project_dir%')] private readonly string $projectDir,
        private readonly CardAnalysisLibrary $analyses,
        private readonly LearningLibrary $cards,
    ) {}

    public function formats(): array
    {
        if ($this->formats !== null) { return $this->formats; }

        $formats = [
            'cas-1' => [
                'id' => 'cas-1', 'title' => 'Une chaîne en trois positions', 'width' => 3, 'depth' => 1, 'shape' => '3',
                'summary' => 'Exprimer les attributs, les traiter théoriquement, puis établir les résultats.',
                'description' => 'La chaîne Exp. IN → TH → Exp. OUT distingue les attributs principaux suivis et leur contexte. En variante 1a, les attributs principaux d’entrée et de sortie sont de même type ; en 1b, leurs types diffèrent. Aucun retour théorique n’est ajouté automatiquement.',
                'coordinates' => '1.0 à 3.0 : trois positions globales, sans sous-niveaux.',
            ],
            'cas-2' => [
                'id' => 'cas-2', 'title' => 'Trois systèmes analysés en trois positions', 'width' => 3, 'depth' => 2, 'shape' => '3 × 3',
                'summary' => 'Préciser chacun des trois systèmes par sa propre chaîne Exp. IN → TH → Exp. OUT.',
                'description' => 'Les attributs de chaque système global font l’objet d’une analyse locale, avec une variante 1a ou 1b explicitée à chaque étage. La sortie locale n.3 alimente l’entrée du système suivant lorsqu’il existe ; la troisième chaîne ne reboucle pas automatiquement sur la première.',
                'coordinates' => '1.0 à 3.0 ; dans le système n, points n.1 à n.3.',
            ],
            'cas-3' => [
                'id' => 'cas-3', 'title' => 'Six positions avec une chaîne de retour', 'width' => 6, 'depth' => 1, 'shape' => '6',
                'summary' => 'Confronter une chaîne d’entrée à une chaîne de retour, sans sous-niveaux.',
                'description' => 'Les positions 2 et 5 traitent théoriquement les éléments de 1 et 4. Les évaluations 4 ↔ 3, 5 ↔ 2 et 6 ↔ 1 précisent les résultats repris, les traitements et les attributs comparables. Cette forme possède six positions globales seulement.',
                'coordinates' => '1.0 à 6.0 : six positions globales et trois évaluations de retour.',
            ],
            'cas-4' => [
                'id' => 'cas-4', 'title' => 'Six systèmes et leurs six sous-niveaux', 'width' => 6, 'depth' => 2, 'shape' => '6 × 6',
                'summary' => 'Explorer les analyses détaillées des fiches et leurs deux étages de comparaison.',
                'description' => 'Les fiches existantes conservent leurs six systèmes globaux, leurs trente-six sous-niveaux, leurs relations qualifiées et leurs évaluations aux deux étages. Deux exemples sont mis en avant ; le catalogue donne accès à toutes les fiches.',
                'coordinates' => '1.0 à 6.0 ; dans le système n, points n.1 à n.6.',
            ],
        ];

        foreach ($formats as &$format) {
            $format['stages'] = $this->stages($format['width']);
            $format['examples'] = [];
        }
        unset($format);

        $examples = json_decode(file_get_contents($this->projectDir.'/config/content/exemples-analyse.json'), true, flags: JSON_THROW_ON_ERROR);
        $slugs = [];
        foreach ($examples as $example) {
            if (!in_array($example['format'], ['cas-1', 'cas-2', 'cas-3'], true) || isset($slugs[$example['slug']])) {
                throw new \LogicException('Format absent ou identifiant d’exemple répété.');
            }
            $slugs[$example['slug']] = true;
            foreach ($example['levels'] as &$level) {
                $level = $this->enrichPoint($level, $level['id'].'.0', $level['system']);
                if ($example['format'] === 'cas-2') {
                    foreach ($level['steps'] as &$step) {
                        $step = $this->enrichPoint($step, $level['id'].'.'.$step['id'], $step['action']);
                    }
                    unset($step);
                }
            }
            unset($level);
            $formats[$example['format']]['examples'][] = $example;
        }

        foreach (['oscillateur-harmonique', 'energie-onde-poynting'] as $slug) {
            $card = $this->cards->find($slug) ?? throw new \LogicException('Fiche mise en avant absente.');
            if ($this->analyses->find($slug) === null) { throw new \LogicException('Analyse mise en avant absente.'); }
            $formats['cas-4']['examples'][] = ['slug' => $slug, 'title' => $card['title'], 'reading_card' => $slug, 'featured' => true];
        }

        return $this->formats = $formats;
    }

    public function findFormat(string $id): ?array
    {
        if (!in_array($id, ['cas-1', 'cas-2', 'cas-3', 'cas-4'], true)) { return null; }
        return $this->formats()[$id];
    }

    public function findExample(string $format, string $slug): ?array
    {
        if (!in_array($format, ['cas-1', 'cas-2', 'cas-3'], true)) { return null; }
        foreach ($this->formats()[$format]['examples'] as $example) {
            if ($example['slug'] === $slug) { return $example; }
        }
        return null;
    }

    private function stages(int $width): array
    {
        $tips = [
            1 => 'Présenter le sujet, ses attributs principaux et leur contexte ; préciser le statut des données.',
            2 => 'Traiter théoriquement les éléments d’entrée pour déduire les conséquences examinées en sortie.',
            3 => 'Établir les résultats et attributs issus du traitement, avec leurs conditions et leur provenance.',
            4 => 'Reprendre les résultats d’entrée et préciser leur comparaison avec la position 3.',
            5 => 'Traiter théoriquement les éléments repris et confronter ce traitement à celui de la position 2.',
            6 => 'Établir les résultats de retour et les comparer aux attributs et conditions de la position 1.',
        ];
        $stages = [];
        foreach (array_slice($this->analyses->stages(), 0, $width, true) as $id => $stage) {
            $stages[] = ['id' => $id, ...$stage, 'title' => $stage['name'], 'subtitle' => $stage['label'], 'tip' => $tips[$id]];
        }
        return $stages;
    }

    private function enrichPoint(array $point, string $coordinate, string $tip): array
    {
        $stage = $this->analyses->stages()[$point['id']] ?? throw new \LogicException('Position analytique inconnue.');
        return array_replace($point, $stage, ['coordinate' => $coordinate, 'subtitle' => $stage['label'], 'tip' => $tip]);
    }
}
