<?php

namespace App\Tests;

use App\Content\{CardAnalysisLibrary, LearningLibrary, SourceLibrary};
use PHPUnit\Framework\TestCase;

final class CardAnalysisLibraryTest extends TestCase
{
    public function testEveryCardHasSixSystemsWithSixSpecificSublevels(): void
    {
        $root = dirname(__DIR__);
        $cards = new LearningLibrary($root, new SourceLibrary($root));
        $library = new CardAnalysisLibrary($root);
        $analyses = $library->all();
        self::assertNull($library->find('../.env'));
        self::assertNull($library->find('inconnue'));
        self::assertEqualsCanonicalizing(array_column($cards->all(), 'slug'), array_keys($analyses));
        $totalLevels = $totalPoints = 0;
        foreach ($cards->all() as $card) {
            $analysis = $library->find($card['slug']);
            self::assertNotEmpty($analysis['question']);
            self::assertNotEmpty($analysis['basis']);
            self::assertCount(6, $analysis['levels'], $card['slug']);
            $coordinates = $actions = $systems = [];
            $sections = ['conditions', 'exemple', 'controle', ...array_column($card['sections'], 'id')];
            foreach ($analysis['levels'] as $offset => $level) {
                $totalLevels++;
                self::assertSame($offset + 1, $level['id']);
                self::assertSame($level['id'].'.0', $level['coordinate']);
                self::assertSame($library->stages()[$level['id']]['label'], $level['label']);
                self::assertContains($level['section'], $sections, $card['slug']);
                foreach (['title', 'system', 'input', 'output'] as $key) { self::assertNotEmpty(trim($level[$key]), $card['slug'].' '.$key); }
                self::assertNotContains($level['system'], $systems, 'Six systèmes distincts : '.$card['slug']);
                $systems[] = $level['system'];
                if ($level['id'] > 3) { self::assertNotEmpty($level['comparison']); }
                self::assertCount(6, $level['steps']);
                foreach ($level['steps'] as $index => $step) {
                    $totalPoints++;
                    self::assertSame($index + 1, $step['id']);
                    self::assertSame($level['id'].'.'.$step['id'], $step['coordinate']);
                    self::assertSame($library->stages()[$step['id']]['label'], $step['label']);
                    self::assertNotContains($step['coordinate'], $coordinates);
                    $coordinates[] = $step['coordinate'];
                    foreach (['title', 'action', 'output'] as $key) { self::assertNotEmpty(trim($step[$key]), $card['slug'].' '.$step['coordinate'].' '.$key); }
                    self::assertNotContains($step['action'], $actions, 'Actions locales distinctes : '.$card['slug']);
                    $actions[] = $step['action'];
                    if ($step['id'] > 3) { self::assertNotEmpty(trim($step['comparison'])); }
                }
            }
            self::assertCount(36, $coordinates);
        }
        self::assertSame(204, $totalLevels);
        self::assertSame(1224, $totalPoints);
    }

    public function testRefinementsDescribeEveryInputRelationAndReturnEvaluation(): void
    {
        $library = new CardAnalysisLibrary(dirname(__DIR__));
        $refined = array_filter($library->all(), static fn (array $analysis): bool => isset($analysis['refinement']));
        foreach (['oscillateur-harmonique', 'continuite-bernoulli', 'lagrange-hamilton', 'travail-energie-mecanique', 'viscosite-poiseuille', 'onde-corde', 'rotation-axe-fixe', 'roulement-sans-glissement', 'referentiel-tournant', 'newton-referentiel', 'force-centrale-orbite', 'hydrostatique-archimede', 'elasticite-lineaire', 'onde-acoustique', 'systeme-et-grandeurs', 'gaz-parfait', 'premier-principe', 'capacites-thermiques', 'detente-isotherme', 'entropie', 'microcanonique', 'boltzmann', 'champ-coulomb', 'potentiel-energie-electrique', 'gauss-sphere-chargee', 'force-lorentz-trajectoire', 'champ-fil-ampere', 'champ-axe-spire', 'solenoide-fini', 'faraday-circuit-fixe', 'induction-tige-mobile', 'condensateur-maxwell', 'auto-induction-energie', 'circuit-rl-transitoire'] as $slug) { self::assertArrayHasKey($slug, $refined); }
        self::assertSame('theorique', $refined['lagrange-hamilton']['subject']['type']);
        $natures = ['logique', 'calculatoire', 'observationnelle', 'interprétative', 'chronologique', 'causale'];
        foreach ($refined as $slug => $analysis) {
            self::assertContains($analysis['subject']['type'], ['physique', 'theorique']);
            foreach (['description', 'scope'] as $key) { self::assertNotEmpty(trim($analysis['subject'][$key]), $slug); }
            self::assertNotEmpty(trim($analysis['refinement']));
            self::assertMatchesRegularExpression('/^\d+\.\d+(?:\.\d+)?$/', $analysis['version']);
            $updated = \DateTimeImmutable::createFromFormat('!Y-m-d', $analysis['updated']);
            self::assertInstanceOf(\DateTimeImmutable::class, $updated);
            self::assertSame($analysis['updated'], $updated->format('Y-m-d'));
            $relations = $evaluations = 0;
            foreach ($analysis['levels'] as $level) {
                foreach ([$level, ...$level['steps']] as $element) {
                    $context = $slug.' '.$element['coordinate'];
                    self::assertNotEmpty(trim($element['input']), $context);
                    self::assertContains($element['relation']['nature'], $natures, $context);
                    self::assertNotEmpty(trim($element['relation']['description']), $context);
                    $relations++;
                    if ($element['id'] <= 3) { self::assertArrayNotHasKey('evaluation', $element, $context); continue; }
                    foreach (['object', 'conditions', 'criterion', 'finding'] as $key) { self::assertNotEmpty(trim($element['evaluation'][$key]), $context.' '.$key); }
                    $evaluations++;
                }
            }
            self::assertSame(42, $relations, $slug);
            self::assertSame(21, $evaluations, $slug);
        }
    }
}
