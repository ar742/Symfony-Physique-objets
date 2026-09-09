<?php

namespace App\Content;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class LearningLibrary
{
    private ?array $cards = null;

    public function __construct(#[Autowire('%kernel.project_dir%')] private readonly string $projectDir, private readonly SourceLibrary $sources) {}

    public function all(): array
    {
        if ($this->cards !== null) {
            return $this->cards;
        }
        $cards = json_decode(file_get_contents($this->projectDir.'/config/content/fiches.json'), true, flags: JSON_THROW_ON_ERROR);
        $references = json_decode(file_get_contents($this->projectDir.'/config/content/references-pilote.json'), true, flags: JSON_THROW_ON_ERROR);
        foreach ($cards as &$card) {
            $card['sources'] = array_map($this->resolveSource(...), $card['sources']);
            $card['references'] = array_map(static fn (string $key): array => $references[$key] ?? throw new \LogicException('Référence externe absente.'), $card['references']);
            foreach ($card['corrections'] as &$correction) {
                $correction['sources'] = array_map($this->resolveSource(...), $correction['sources']);
            }
            unset($correction);
        }
        unset($card);
        return $this->cards = $cards;
    }

    public function find(string $slug): ?array
    {
        foreach ($this->all() as $card) {
            if ($card['slug'] === $slug) {
                return $card;
            }
        }
        return null;
    }

    private function resolveSource(array $source): array
    {
        $document = $this->sources->find($source['doc']) ?? throw new \LogicException('Recueil absent.');
        $entry = $this->sources->entry($source['doc'], $source['code']) ?? throw new \LogicException('Fiche source absente.');
        $end = $document['pages'];
        foreach ($document['entries'] as $candidate) {
            if ($candidate['page'] > $entry['page']) {
                $end = min($end, $candidate['page'] - 1);
            }
        }
        if ($source['page'] < $entry['page'] || $source['page'] > $end) {
            throw new \LogicException('Page hors de la fiche source '.$source['code']);
        }
        $source['document_title'] = $document['title'];
        return $source;
    }
}
