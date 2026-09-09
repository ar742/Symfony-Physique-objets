<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'catalog_reference')]
class Reference
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    public int $id;

    #[ORM\ManyToOne(targetEntity: Domain::class)]
    #[ORM\JoinColumn(nullable: true)]
    public ?Domain $domain;

    #[ORM\Column]
    public bool $theory;

    #[ORM\Column(length: 255)]
    public string $title;

    #[ORM\Column(type: 'datetime_immutable')]
    public \DateTimeImmutable $date;

    #[ORM\Column(type: 'text', nullable: true)]
    public ?string $content;

    #[ORM\Column(length: 255, nullable: true)]
    public ?string $webLinks;
}
