<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'catalog_symbolization')]
class Symbolization
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    public int $id;

    #[ORM\ManyToOne(targetEntity: AnalysisLevel::class)]
    #[ORM\JoinColumn(nullable: true)]
    public ?AnalysisLevel $level;

    #[ORM\Column(type: 'text')]
    public string $content;
}
