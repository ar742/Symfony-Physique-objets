<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'catalog_entry')]
class PhysicsEntry
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    public int $id;

    #[ORM\ManyToOne(targetEntity: Topic::class)]
    #[ORM\JoinColumn(nullable: true)]
    public ?Topic $topic;

    #[ORM\ManyToOne(targetEntity: AnalysisLevel::class)]
    #[ORM\JoinColumn(nullable: false)]
    public AnalysisLevel $analysisLevel;

    #[ORM\Column(length: 255)]
    public string $title;

    #[ORM\Column(length: 255)]
    public string $author;

    #[ORM\Column(type: 'datetime_immutable')]
    public \DateTimeImmutable $date;

    #[ORM\Column(type: 'text')]
    public string $content;

    #[ORM\Column(type: 'text', nullable: true)]
    public ?string $evaluation;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    public ?\DateTimeImmutable $updatedAt;

    #[ORM\Column(length: 255, nullable: true)]
    public ?string $webLinks;
}
