<?php

namespace App\Repository;

use App\Entity\{AnalysisLevel, Domain, PhysicsEntry, Reference, Symbolization, Topic};
use Doctrine\ORM\EntityManagerInterface;

final class CatalogRepository
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function counts(): array
    {
        return [
            'domains' => $this->em->getRepository(Domain::class)->count([]),
            'topics' => $this->em->getRepository(Topic::class)->count([]),
            'entries' => $this->em->getRepository(PhysicsEntry::class)->count([]),
        ];
    }

    public function catalog(): array
    {
        $counts = $this->em->getConnection()->fetchAllKeyValue('SELECT topic_id, COUNT(*) FROM catalog_entry GROUP BY topic_id');
        $topics = [];
        foreach ($this->em->getRepository(Topic::class)->findBy([], ['title' => 'ASC']) as $topic) {
            $topics[$topic->domain?->id ?? 0][] = ['topic' => $topic, 'count' => $counts[$topic->id] ?? 0];
        }
        $references = [];
        foreach ($this->em->getRepository(Reference::class)->findBy([], ['title' => 'ASC']) as $reference) {
            $references[$reference->domain?->id ?? 0][] = $reference;
        }

        return ['domains' => $this->em->getRepository(Domain::class)->findBy([], ['title' => 'ASC']), 'topics' => $topics, 'domainReferences' => $references];
    }

    public function topic(int $id): ?Topic
    {
        return $this->em->find(Topic::class, $id);
    }

    public function entry(int $id): ?PhysicsEntry
    {
        return $this->em->find(PhysicsEntry::class, $id);
    }

    public function entries(Topic $topic): array
    {
        return $this->em->createQueryBuilder()->select('p', 'l')
            ->from(PhysicsEntry::class, 'p')->join('p.analysisLevel', 'l')
            ->where('p.topic = :topic')->setParameter('topic', $topic)
            ->orderBy('l.base', 'ASC')->addOrderBy('l.sub', 'ASC')->addOrderBy('p.id', 'ASC')
            ->getQuery()->getResult();
    }

    public function references(?Domain $domain): array
    {
        return $domain ? $this->em->getRepository(Reference::class)->findBy(['domain' => $domain], ['title' => 'ASC']) : [];
    }

    public function levels(): array
    {
        $symbols = [];
        foreach ($this->em->getRepository(Symbolization::class)->findBy([], ['id' => 'ASC']) as $symbol) {
            $symbols[$symbol->level?->id ?? 0][] = $symbol;
        }

        return ['levels' => $this->em->getRepository(AnalysisLevel::class)->findBy([], ['base' => 'ASC', 'sub' => 'ASC']), 'symbols' => $symbols];
    }
}
