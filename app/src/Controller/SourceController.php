<?php

namespace App\Controller;

use App\Content\SourceLibrary;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\{BinaryFileResponse, Response, ResponseHeaderBag};
use Symfony\Component\Routing\Attribute\Route;

final class SourceController extends AbstractController
{
    #[Route('/recueils/', name: 'source_index', methods: ['GET'])]
    public function index(SourceLibrary $sources): Response
    {
        $documents = $sources->all();
        foreach ($documents as &$document) {
            $document['groups'] = [];
            foreach ($document['entries'] as $entry) { $document['groups'][$entry['group']][] = $entry; }
        }
        unset($document);
        return $this->render('site/sources.html.twig', ['documents' => $documents]);
    }

    #[Route('/recueils/{key}/document', name: 'source_document', requirements: ['key' => 'cpge|theorique'], methods: ['GET', 'HEAD'])]
    public function document(string $key, SourceLibrary $sources, #[Autowire('%env(SOURCE_PDF_DIR)%')] string $directory): Response
    {
        $source = $sources->find($key) ?? throw $this->createNotFoundException();
        $file = $directory.'/'.$source['filename'];
        if (!is_file($file)) { throw $this->createNotFoundException('Document source indisponible.'); }
        $response = new BinaryFileResponse($file);
        $response->headers->set('Content-Type', 'application/pdf');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE, $source['filename']);
        $response->setPrivate();

        return $response;
    }
}
