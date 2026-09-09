<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'catalog_level')]
#[ORM\UniqueConstraint(name: 'level_coordinates', columns: ['base', 'sub'])]
class AnalysisLevel
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    public int $id;

    #[ORM\Column]
    public int $base;

    #[ORM\Column]
    public int $sub;

    #[ORM\Column(type: 'text')]
    public string $content;
}
