<?php

namespace App\Controller;

use App\Content\{LearningLibrary, LoopGuide};
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class LearningController extends AbstractController
{
    #[Route('/fiches/', name: 'learning_index', methods: ['GET'])]
    public function index(LearningLibrary $library): Response
    {
        return $this->render('science/index.html.twig', ['cards' => $library->all()]);
    }

    #[Route('/fiches/corrections', name: 'learning_corrections', priority: 10, methods: ['GET'])]
    public function corrections(LearningLibrary $library): Response
    {
        return $this->render('science/corrections.html.twig', ['cards' => $library->all()]);
    }

    #[Route('/fiches/{slug}', name: 'learning_card', requirements: ['slug' => '[a-z][a-z0-9-]*'], methods: ['GET'])]
    public function card(string $slug, LearningLibrary $library, LoopGuide $guide): Response
    {
        $card = $library->find($slug) ?? throw $this->createNotFoundException('Fiche introuvable.');
        $cards = $library->all();
        $index = array_search($slug, array_column($cards, 'slug'), true);
        return $this->render('science/card.html.twig', [
            'card' => $card,
            'locations' => $guide->locationsFor($slug),
            'previous' => $cards[$index - 1] ?? null,
            'next' => $cards[$index + 1] ?? null,
        ]);
    }

    #[Route('/boucle/{base}', name: 'learning_subloop', requirements: ['base' => '[1-6]'], methods: ['GET'])]
    public function subloop(int $base, LoopGuide $guide, LearningLibrary $library): Response
    {
        $loop = $guide->subloop($base) ?? throw $this->createNotFoundException();
        foreach ($loop['steps'] as &$step) {
            $card = $library->find($step['card']) ?? throw new \LogicException('Fiche liée absente.');
            $step['card_title'] = $card['title'];
        }
        unset($step);
        return $this->render('science/subloop.html.twig', [
            'base' => $base, 'steps' => $loop['steps'], 'parent' => $guide->steps()[$base - 1],
            'parents' => $guide->steps(), 'subloops' => $guide->subloops(),
        ]);
    }
}
