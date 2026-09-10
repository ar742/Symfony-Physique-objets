<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class GraphStudyController extends AbstractController
{
    #[Route('/graphes/', name: 'graph_index', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('graph/cities.html.twig');
    }

    #[Route('/graphes/dependances', name: 'graph_dependencies', methods: ['GET'])]
    public function dependencies(): Response
    {
        return $this->render('graph/dependencies.html.twig');
    }
}
