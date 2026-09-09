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
        self::assertCount(12, $cards);
        self::assertCount(12, array_unique(array_column($cards, 'slug')));
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
        self::assertCount(9, $corrections);
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
    }
}
