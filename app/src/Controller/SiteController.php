<?php

namespace App\Controller;

use App\Repository\CatalogRepository;
use App\Content\{LearningLibrary, LoopGuide};
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class SiteController extends AbstractController
{
    #[Route('/', name: 'sitephys_physmvc_home', methods: ['GET'])]
    public function home(LoopGuide $guide, LearningLibrary $library): Response
    {
        return $this->render('site/loop-home.html.twig', ['steps' => $guide->steps(), 'card_count' => count($library->all())]);
    }

    #[Route('/presentation/', name: 'sitephys_physmvc_presentation', methods: ['GET'])]
    public function presentation(): Response
    {
        return $this->render('site/presentation.html.twig');
    }

    #[Route('/topic/', name: 'sitephys_physmvc_topic', methods: ['GET'])]
    public function topics(CatalogRepository $catalog): Response
    {
        return $this->render('site/topics.html.twig', $catalog->catalog() + ['counts' => $catalog->counts()]);
    }

    #[Route('/hometopics/{idTopic}', name: 'sitephys_physmvc_phys_hometopic', requirements: ['idTopic' => '\\d+'], methods: ['GET'])]
    public function topic(int $idTopic, CatalogRepository $catalog): Response
    {
        $topic = $catalog->topic($idTopic) ?? throw $this->createNotFoundException('Thème introuvable.');

        return $this->render('site/topic.html.twig', [
            'topic' => $topic, 'entries' => $catalog->entries($topic), 'references' => $catalog->references($topic->domain),
        ]);
    }

    #[Route('/phys/{id}', name: 'sitephys_physmvc_phys_view', requirements: ['id' => '\\d+'], methods: ['GET'])]
    public function entry(int $id, CatalogRepository $catalog): Response
    {
        $entry = $catalog->entry($id) ?? throw $this->createNotFoundException('Fiche introuvable.');

        return $this->render('site/entry.html.twig', ['entry' => $entry, 'references' => $catalog->references($entry->topic?->domain)]);
    }

    #[Route('/links/', name: 'sitephys_physmvc_links', methods: ['GET'])]
    public function links(): Response
    {
        return $this->render('site/links.html.twig');
    }

    #[Route('/symbolization/', name: 'sitephys_physmvc_symbolization', methods: ['GET'])]
    public function levels(CatalogRepository $catalog): Response
    {
        return $this->render('site/levels.html.twig', $catalog->levels());
    }
}
