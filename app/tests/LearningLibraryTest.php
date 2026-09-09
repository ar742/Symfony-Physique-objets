<?php

namespace App\Tests;

use App\Content\{LearningLibrary, LoopGuide, SourceLibrary};
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
        self::assertCount(8, $cards);
        self::assertCount(8, array_unique(array_column($cards, 'slug')));
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
            self::assertNotEmpty((new LoopGuide(dirname(__DIR__), new SourceLibrary(dirname(__DIR__))))->locationsFor($card['slug']));
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
                    foreach ($xpath->query('//m:mfrac|//m:msub|//m:msup|//m:munder') as $element) {
                        self::assertSame(2, $element->childElementCount, $equation['id']);
                    }
                }
            }
            foreach ($card['corrections'] as $correction) {
                self::assertNotContains($correction['id'], $corrections);
                self::assertNotEmpty($correction['sources']);
                $corrections[] = $correction['id'];
            }
        }
        self::assertCount(7, $corrections);
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
    }
}
