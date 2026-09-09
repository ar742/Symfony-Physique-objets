<?php

namespace App\Content;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class DomainLibrary
{
    private ?array $domains = null;

    public function __construct(
        #[Autowire('%kernel.project_dir%')] private readonly string $projectDir,
        private readonly LearningLibrary $learning,
        private readonly SourceLibrary $sources,
    ) {}

    public function all(): array
    {
        if ($this->domains !== null) { return $this->domains; }
        $domains = json_decode(file_get_contents($this->projectDir.'/config/content/domaines.json'), true, flags: JSON_THROW_ON_ERROR);
        foreach ($domains as &$domain) {
            $domain['cards'] = array_values(array_filter($this->learning->all(), static fn (array $card): bool => $card['domain'] === $domain['slug']));
            $domain['loops'] ??= [];
            if ($domain['steps']) {
                array_unshift($domain['loops'], [
                    'anchor' => 'boucle-domaine',
                    'title' => $domain['loop_title'] ?? 'La boucle : '.$domain['title'],
                    'steps' => $domain['steps'],
                ]);
            }
            $domain['steps'] = [];
            foreach ($domain['loops'] as $group) {
                foreach ($group['steps'] as $step) {
                    $domain['steps'][] = $step + ['loop_anchor' => $group['anchor'], 'loop_title' => $group['title']];
                }
            }
            foreach ($domain['sources'] as &$source) {
                $entry = $this->sources->entry($source['doc'], $source['code']) ?? throw new \LogicException('Source de domaine absente.');
                $source += ['page' => $entry['page'], 'title' => $entry['title']];
            }
            unset($source);
        }
        unset($domain);
        return $this->domains = $domains;
    }

    public function available(): array
    {
        return array_values(array_filter($this->all(), static fn (array $domain): bool => $domain['cards'] !== []));
    }

    public function find(string $slug): ?array
    {
        foreach ($this->all() as $domain) {
            if ($domain['slug'] === $slug) { return $domain; }
        }
        return null;
    }
}
