<?php

namespace App\Controller;

use App\Content\{CardAnalysisLibrary, DomainLibrary, LearningLibrary, LoopGuide};
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class LearningController extends AbstractController
{
    #[Route('/fiches/', name: 'learning_index', methods: ['GET'])]
    public function index(LearningLibrary $library, DomainLibrary $domains, CardAnalysisLibrary $analyses): Response
    {
        return $this->render('science/index.html.twig', ['cards' => $library->all(), 'domains' => $domains->available(), 'analyses' => $analyses->all()]);
    }

    #[Route('/domaines/', name: 'learning_domains', methods: ['GET'])]
    public function domains(DomainLibrary $domains): Response
    {
        return $this->render('science/domains.html.twig', ['domains' => $domains->all()]);
    }

    #[Route('/domaines/{slug}', name: 'learning_domain', requirements: ['slug' => '[a-z][a-z0-9-]*'], methods: ['GET'])]
    public function domain(string $slug, DomainLibrary $domains, CardAnalysisLibrary $analyses): Response
    {
        $domain = $domains->find($slug);
        if ($domain === null || $domain['cards'] === []) { throw $this->createNotFoundException('Parcours indisponible.'); }
        foreach ($domain['loops'] as &$group) {
            foreach ($group['steps'] as &$step) {
                $step['href'] = $this->generateUrl('learning_card', ['slug' => $step['card'], '_fragment' => $step['section']]);
            }
            unset($step);
        }
        unset($group);
        return $this->render('science/domain.html.twig', ['domain' => $domain, 'analyses' => $analyses->all()]);
    }

    #[Route('/fiches/corrections', name: 'learning_corrections', priority: 10, methods: ['GET'])]
    public function corrections(LearningLibrary $library): Response
    {
        return $this->render('science/corrections.html.twig', ['cards' => $library->all()]);
    }

    #[Route('/fiches/{slug}', name: 'learning_card', requirements: ['slug' => '[a-z][a-z0-9-]*'], methods: ['GET'])]
    public function card(string $slug, LearningLibrary $library, LoopGuide $guide, DomainLibrary $domains, CardAnalysisLibrary $analyses): Response
    {
        $card = $library->find($slug) ?? throw $this->createNotFoundException('Fiche introuvable.');
        $domain = $domains->find($card['domain']) ?? throw new \LogicException('Domaine de fiche absent.');
        $cards = $domain['cards'];
        $index = array_search($slug, array_column($cards, 'slug'), true);
        $analysis = $analyses->find($slug) ?? throw new \LogicException('Analyse de fiche absente.');
        foreach ($analysis['levels'] as &$level) {
            $level['href'] = $this->generateUrl('learning_card_analysis', ['slug' => $slug, 'base' => $level['id']]);
        }
        unset($level);
        return $this->render('science/card.html.twig', [
            'card' => $card,
            'analysis' => $analysis,
            'locations' => $guide->locationsFor($slug),
            'domain' => $domain,
            'domain_locations' => array_values(array_filter($domain['steps'], static fn (array $step): bool => $step['card'] === $slug)),
            'previous' => $cards[$index - 1] ?? null,
            'next' => $cards[$index + 1] ?? null,
        ]);
    }

    #[Route('/fiches/{slug}/analyse/{base}', name: 'learning_card_analysis', requirements: ['slug' => '[a-z][a-z0-9-]*', 'base' => '[1-6]'], methods: ['GET'])]
    public function analysis(string $slug, int $base, LearningLibrary $library, CardAnalysisLibrary $analyses): Response
    {
        $card = $library->find($slug) ?? throw $this->createNotFoundException('Fiche introuvable.');
        $analysis = $analyses->find($slug) ?? throw $this->createNotFoundException('Analyse introuvable.');
        $level = $analysis['levels'][$base - 1];
        foreach ($level['steps'] as &$step) { $step['href'] = '#point-'.$step['coordinate']; }
        unset($step);
        return $this->render('science/card-analysis.html.twig', [
            'card' => $card, 'analysis' => $analysis, 'level' => $level, 'base' => $base,
            'stages' => $analyses->stages(),
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
