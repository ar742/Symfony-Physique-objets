<?php

namespace App\Tests;

use App\Content\{DomainLibrary, LearningLibrary, LoopGuide, SourceLibrary};
use PHPUnit\Framework\TestCase;

final class LearningLibraryTest extends TestCase
{
    private function library(): LearningLibrary
    {
        return new LearningLibrary(dirname(__DIR__), new SourceLibrary(dirname(__DIR__)));
    }

    public function testEveryPrecisionLinksToAnExistingCardSection(): void
    {
        $guide = new LoopGuide(dirname(__DIR__), new SourceLibrary(dirname(__DIR__)));
        $library = $this->library();
        self::assertNull($guide->subloop(0));
        self::assertNull($guide->subloop(7));
        self::assertNull($library->find('../.env'));
        self::assertCount(6, $guide->subloops());
        $coordinates = [];
        foreach ($guide->subloops() as $loop) {
            self::assertCount(6, $loop['steps']);
            foreach ($loop['steps'] as $step) {
                self::assertSame($loop['base'].'.'.$step['id'], $step['coordinate']);
                self::assertNotContains($step['coordinate'], $coordinates);
                $coordinates[] = $step['coordinate'];
                $card = $library->find($step['card']);
                self::assertNotNull($card);
                $anchors = ['conditions', 'exemple', 'controle', 'sources', 'dans-la-boucle', ...array_column($card['sections'], 'id')];
                if ($card['corrections']) { $anchors[] = 'corrections'; }
                self::assertContains($step['section'], $anchors);
            }
        }
        self::assertCount(36, $coordinates);
    }

    public function testCardsHavePreciseSourcesAndWellFormedMath(): void
    {
        $cards = $this->library()->all();
        self::assertCount(22, $cards);
        self::assertCount(22, array_unique(array_column($cards, 'slug')));
        $corrections = [];
        foreach ($cards as $card) {
            $anchors = ['conditions', 'exemple', 'controle', 'corrections', 'sources', 'dans-la-boucle', ...array_column($card['sections'], 'id')];
            self::assertCount(count($anchors), array_unique($anchors), 'Identifiants uniques : '.$card['slug']);
            self::assertNotEmpty($card['sources']);
            foreach ($card['sources'] as $source) {
                // LearningLibrary also rejects pages outside the referenced source card.
                self::assertNotEmpty($source['section']);
                self::assertNotEmpty($source['document_title']);
            }
            foreach ($card['references'] as $reference) {
                self::assertSame('https', parse_url($reference['url'], PHP_URL_SCHEME));
            }
            $sources = new SourceLibrary(dirname(__DIR__));
            $domain = (new DomainLibrary(dirname(__DIR__), $this->library(), $sources))->find($card['domain']);
            self::assertNotNull($domain);
            $locations = array_filter($domain['steps'], static fn (array $step): bool => $step['card'] === $card['slug']);
            self::assertNotEmpty([...$locations, ...(new LoopGuide(dirname(__DIR__), $sources))->locationsFor($card['slug'])]);
            foreach ($card['sections'] as $section) {
                foreach ($section['equations'] as $equation) {
                    self::assertMatchesRegularExpression('/^[a-z]+$/', $equation['id']);
                    $path = dirname(__DIR__).'/templates/science/equations/'.$equation['id'].'.html.twig';
                    self::assertFileExists($path);
                    $xml = new \DOMDocument();
                    self::assertTrue($xml->loadXML(file_get_contents($path)));
                    self::assertSame('http://www.w3.org/1998/Math/MathML', $xml->documentElement->namespaceURI);
                    // Fractions and subscripts require exactly two arguments.
                    $xpath = new \DOMXPath($xml);
                    $xpath->registerNamespace('m', 'http://www.w3.org/1998/Math/MathML');
                    foreach ($xpath->query('//m:mfrac|//m:msub|//m:msup|//m:munder|//m:mover') as $element) {
                        self::assertSame(2, $element->childElementCount, $equation['id']);
                    }
                    foreach ($xpath->query('//m:msubsup') as $element) {
                        self::assertSame(3, $element->childElementCount, $equation['id']);
                    }
                }
            }
            foreach ($card['corrections'] as $correction) {
                self::assertNotContains($correction['id'], $corrections);
                self::assertNotEmpty($correction['sources']);
                $corrections[] = $correction['id'];
            }
        }
        self::assertCount(17, $corrections);
    }

    public function testDisplayedExamplesMatchIndependentCalculations(): void
    {
        $R = 6.02214076e23 * 1.380649e-23;
        $library = $this->library();
        $containsNumber = function (string $slug, float $value, int $decimals) use ($library): void {
            $example = $library->find($slug)['example'];
            $text = implode(' ', $example['steps']).' '.$example['result'];
            $text = preg_replace('/[\s\x{00A0}\x{202F}]+/u', '', $text);
            self::assertStringContainsString(number_format($value, $decimals, ',', ''), $text, $slug);
        };
        $containsNumber('gaz-parfait', $R * 300 / .010, 2);
        $containsNumber('capacites-thermiques', 1.5 * $R * 10, 3);
        $containsNumber('capacites-thermiques', 2.5 * $R * 10, 3);
        $containsNumber('detente-isotherme', $R * 300 * log(2), 3);
        $containsNumber('entropie', $R * log(2), 3);
        $containsNumber('microcanonique', log(3), 6);
        $containsNumber('boltzmann', 1 / (1 + exp(1)), 6);
        $containsNumber('boltzmann', 1 + exp(-1), 6);
        $containsNumber('newton-referentiel', 9.81 * sin(pi()/6), 3);
        $containsNumber('newton-referentiel', 2 * 9.81 * cos(pi()/6), 3);
        $containsNumber('travail-energie-mecanique', sqrt(3**2 + 2 * (6 - 2) * 4 / 2), 3);
        $containsNumber('oscillateur-harmonique', 2 * pi() * sqrt(.2/20), 6);
        $containsNumber('oscillateur-harmonique', .5 * 20 * .05**2, 3);
        $containsNumber('oscillateur-harmonique', sqrt(20/.2 - (.4/(2*.2))**2), 6);
        $containsNumber('force-centrale-orbite', sqrt(3.986e14/7e6), 3);
        $containsNumber('force-centrale-orbite', 2 * pi() * sqrt((7e6)**3/3.986e14), 3);
        $containsNumber('rotation-axe-fixe', .5 * 2 * .3**2, 3);
        $containsNumber('rotation-axe-fixe', .12 / (.5 * 2 * .3**2), 6);
        $containsNumber('rotation-axe-fixe', .5 * .09 * 4**2, 3);
        $containsNumber('roulement-sans-glissement', sqrt(2 * 9.81 * .5 / (1 + .5)), 6);
        $containsNumber('roulement-sans-glissement', tan(pi()/6) / 3, 6);
        $containsNumber('roulement-sans-glissement', 9.81 * .5, 3);
        $containsNumber('referentiel-tournant', .5 * 2**2 * .4, 3);
        $containsNumber('referentiel-tournant', 2 * .5 * 2 * .3, 3);
        self::assertStringContainsString('−0,600 eθ', implode(' ', $library->find('referentiel-tournant')['example']['steps']), 'Coriolis opposé à eθ pour une vitesse radiale sortante');
        $containsNumber('lagrange-hamilton', .1 / .2, 3);
        $containsNumber('lagrange-hamilton', .1**2 / (2 * .2) + .5 * 20 * .05**2, 3);
        $containsNumber('lagrange-hamilton', sqrt(.05**2 + (.1 / (.2 * 10))**2), 6);
        $containsNumber('hydrostatique-archimede', 101325 + 1000 * 9.81 * 2.4, 3);
        $containsNumber('hydrostatique-archimede', 600 * .002 / 1000 * 1e3, 3);
        $containsNumber('hydrostatique-archimede', 600 * .002 * 9.81, 3);
        $containsNumber('continuite-bernoulli', .0004 / .0001, 3);
        $containsNumber('continuite-bernoulli', .5 * 1000 * (4**2 - 1**2), 3);
        $containsNumber('continuite-bernoulli', (150000 - .5 * 1000 * (4**2 - 1**2)) / 1000, 3);
        $flow = pi() * .0005**4 * 400 / (8 * .001 * 1);
        $containsNumber('viscosite-poiseuille', $flow * 1e6 * 60, 6);
        $containsNumber('viscosite-poiseuille', 1000 * ($flow / (pi() * .0005**2)) * .001 / .001, 3);
        $containsNumber('viscosite-poiseuille', 400 * $flow * 1e6, 6);
        $containsNumber('elasticite-lineaire', 80 * 2 / (200e9 * 4e-6) * 1e3, 3);
        $containsNumber('elasticite-lineaire', .5 * 80 * (80 * 2 / (200e9 * 4e-6)), 6);
        $containsNumber('onde-corde', sqrt(72 / .005), 3);
        $containsNumber('onde-corde', 3 * sqrt(72 / .005) / (2 * 1.2), 3);
        $containsNumber('onde-corde', .001 * 3 * pi() / 1.2, 6);
        $soundIntensity = .2**2 / (2 * 1.2 * 340);
        $containsNumber('onde-acoustique', $soundIntensity * 1e6, 6);
        $containsNumber('onde-acoustique', 10 * log10($soundIntensity / 1e-12), 6);
        $containsNumber('onde-acoustique', .2 / (1.2 * 340) * 1e3, 6);
    }
}
