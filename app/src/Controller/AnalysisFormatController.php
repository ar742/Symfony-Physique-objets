<?php

namespace App\Controller;

use App\Content\AnalysisFormatLibrary;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class AnalysisFormatController extends AbstractController
{
    #[Route('/analyses/{format}', name: 'analysis_format', requirements: ['format' => 'cas-[1-4]'], methods: ['GET'])]
    public function format(string $format, AnalysisFormatLibrary $library): Response
    {
        $metadata = $library->findFormat($format) ?? throw $this->createNotFoundException('Forme d’analyse introuvable.');
        return $this->render('analysis/format.html.twig', ['format' => $metadata, 'formats' => $library->formats()]);
    }

    #[Route('/analyses/{format}/{slug}', name: 'analysis_example', requirements: ['format' => 'cas-[1-3]', 'slug' => '[a-z][a-z0-9-]*'], methods: ['GET'])]
    public function example(string $format, string $slug, AnalysisFormatLibrary $library): Response
    {
        $example = $library->findExample($format, $slug) ?? throw $this->createNotFoundException('Exemple introuvable dans cette forme.');
        foreach ($example['levels'] as &$level) {
            $level['href'] = $format === 'cas-2'
                ? $this->generateUrl('analysis_example_level', ['slug' => $slug, 'base' => $level['id']])
                : '#point-'.$level['coordinate'];
        }
        unset($level);
        return $this->render('analysis/example.html.twig', [
            'format' => $library->findFormat($format), 'example' => $example, 'formats' => $library->formats(),
        ]);
    }

    #[Route('/analyses/cas-2/{slug}/niveau/{base}', name: 'analysis_example_level', requirements: ['slug' => '[a-z][a-z0-9-]*', 'base' => '[1-3]'], methods: ['GET'])]
    public function level(string $slug, int $base, AnalysisFormatLibrary $library): Response
    {
        $example = $library->findExample('cas-2', $slug) ?? throw $this->createNotFoundException('Exemple à deux étages introuvable.');
        $level = $example['levels'][$base - 1] ?? throw $this->createNotFoundException('Système introuvable.');
        foreach ($level['steps'] as &$step) { $step['href'] = '#point-'.$step['coordinate']; }
        unset($step);
        return $this->render('analysis/level.html.twig', [
            'format' => $library->findFormat('cas-2'), 'example' => $example, 'level' => $level, 'base' => $base,
            'formats' => $library->formats(),
        ]);
    }
}
