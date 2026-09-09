<?php

namespace App\Content;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class SourceLibrary
{
    private array $documents;

    public function __construct(#[Autowire('%kernel.project_dir%')] string $projectDir)
    {
        $this->documents = json_decode(file_get_contents($projectDir.'/config/content/recueils.json'), true, flags: JSON_THROW_ON_ERROR);
    }

    public function all(): array { return $this->documents; }

    public function find(string $key): ?array
    {
        foreach ($this->documents as $document) {
            if ($document['key'] === $key) { return $document; }
        }
        return null;
    }

    public function entry(string $key, string $code): ?array
    {
        foreach ($this->find($key)['entries'] ?? [] as $entry) {
            if ($entry['code'] === $code) { return $entry; }
        }
        return null;
    }
}
