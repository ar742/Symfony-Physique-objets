<?php

namespace App\Tests;

use App\Content\{AnalysisFormatLibrary, CardAnalysisLibrary, LearningLibrary, SourceLibrary};
use PHPUnit\Framework\TestCase;

final class AnalysisFormatLibraryTest extends TestCase
{
    private function library(): AnalysisFormatLibrary
    {
        $root = dirname(__DIR__);
        return new AnalysisFormatLibrary($root, new CardAnalysisLibrary($root), new LearningLibrary($root, new SourceLibrary($root)));
    }

    public function testFourFormatsExposeTheirOwnDepthAndRoles(): void
    {
        $formats = $this->library()->formats();
        self::assertSame(['cas-1', 'cas-2', 'cas-3', 'cas-4'], array_keys($formats));
        $expected = ['cas-1' => [3, 1, '3'], 'cas-2' => [3, 2, '3 × 3'], 'cas-3' => [6, 1, '6'], 'cas-4' => [6, 2, '6 × 6']];
        $roles = (new CardAnalysisLibrary(dirname(__DIR__)))->stages();
        foreach ($formats as $id => $format) {
            self::assertSame($id, $format['id']);
            self::assertSame($expected[$id], [$format['width'], $format['depth'], $format['shape']]);
            foreach (['title', 'summary', 'description', 'coordinates'] as $field) { self::assertNotEmpty(trim($format[$field]), $id.' '.$field); }
            self::assertCount($format['width'], $format['stages']);
            foreach ($format['stages'] as $index => $stage) {
                self::assertSame($index + 1, $stage['id']);
                foreach (['label', 'name', 'color'] as $field) { self::assertSame($roles[$stage['id']][$field], $stage[$field]); }
                self::assertSame($stage['name'], $stage['title']);
                self::assertSame($stage['label'], $stage['subtitle']);
                self::assertNotEmpty(trim($stage['tip']));
            }
        }
    }

    public function testAuthoredExamplesHaveThePromisedShapesAndAttributeTypes(): void
    {
        $root = dirname(__DIR__);
        $library = $this->library();
        $cards = new LearningLibrary($root, new SourceLibrary($root));
        $slugs = [];
        $totals = ['levels' => 0, 'points' => 0, 'relations' => 0, 'evaluations' => 0];
        foreach (['cas-1' => 4, 'cas-2' => 2, 'cas-3' => 2] as $format => $count) {
            $examples = $library->findFormat($format)['examples'];
            self::assertCount($count, $examples, $format);
            $variants = [];
            foreach ($examples as $example) {
                $context = $format.'/'.$example['slug'];
                self::assertSame($format, $example['format']);
                self::assertMatchesRegularExpression('/^[a-z][a-z0-9-]*$/', $example['slug']);
                self::assertNotContains($example['slug'], $slugs, $context);
                $slugs[] = $example['slug'];
                foreach (['title', 'question', 'scope', 'basis', 'reading_card'] as $field) { self::assertNotEmpty(trim($example[$field]), $context.' '.$field); }
                self::assertNotNull($cards->find($example['reading_card']), $context.' fiche de lecture');
                $this->assertAttributes($example['attributes'], $context);
                $this->assertEvaluation($example['review'], $context.' review');
                if ($format !== 'cas-3') {
                    self::assertContains($example['variant'], ['1a', '1b'], $context);
                    $variants[] = $example['variant'];
                } else {
                    self::assertArrayNotHasKey('variant', $example, $context);
                }
                self::assertCount($format === 'cas-3' ? 6 : 3, $example['levels'], $context);
                $coordinates = $actions = [];
                foreach ($example['levels'] as $index => $level) {
                    $totals['levels']++;
                    $totals['relations']++;
                    self::assertSame($index + 1, $level['id'], $context);
                    self::assertSame($level['id'].'.0', $level['coordinate']);
                    self::assertNotEmpty(trim($level['system']), $context);
                    self::assertSame($level['system'], $level['tip']);
                    $this->assertPoint($level, $context);
                    $coordinates[] = $level['coordinate'];
                    $actions[] = $level['action'];
                    if ($format === 'cas-2') {
                        self::assertContains($level['variant'], ['1a', '1b'], $context);
                        $this->assertAttributes($level['attributes'], $context.' '.$level['coordinate']);
                        self::assertCount(3, $level['steps']);
                        foreach ($level['steps'] as $offset => $step) {
                            $totals['points']++;
                            $totals['relations']++;
                            self::assertSame($offset + 1, $step['id']);
                            self::assertSame($level['id'].'.'.$step['id'], $step['coordinate']);
                            self::assertSame($step['action'], $step['tip']);
                            $this->assertPoint($step, $context);
                            self::assertArrayNotHasKey('steps', $step);
                            self::assertArrayNotHasKey('evaluation', $step);
                            $coordinates[] = $step['coordinate'];
                            $actions[] = $step['action'];
                        }
                        // The global theoretical system still begins locally with Exp. IN.
                        self::assertSame('Exp. IN', $level['steps'][0]['label']);
                        self::assertSame('TH', $level['steps'][1]['label']);
                        self::assertSame('Exp. OUT', $level['steps'][2]['label']);
                    } else {
                        self::assertArrayNotHasKey('steps', $level, $context);
                    }
                    if ($format === 'cas-3' && $level['id'] >= 4) {
                        self::assertNotEmpty(trim($level['comparison']), $context);
                        $this->assertEvaluation($level['evaluation'], $context.' '.$level['coordinate']);
                        $totals['evaluations']++;
                    } else {
                        self::assertArrayNotHasKey('evaluation', $level, $context);
                    }
                }
                self::assertCount(count($coordinates), array_unique($coordinates), $context.' coordonnées uniques');
                self::assertCount(count($actions), array_unique($actions), $context.' actions spécifiques');
                foreach ($example['references'] ?? [] as $reference) {
                    foreach (['title', 'url', 'note'] as $field) { self::assertNotEmpty(trim($reference[$field]), $context); }
                    self::assertNotFalse(filter_var($reference['url'], FILTER_VALIDATE_URL), $context);
                    self::assertContains(parse_url($reference['url'], PHP_URL_SCHEME), ['https', 'http'], $context);
                }
            }
            if ($format === 'cas-1') { self::assertEqualsCanonicalizing(['1a', '1a', '1b', '1b'], $variants); }
            if ($format === 'cas-2') { self::assertEqualsCanonicalizing(['1a', '1b'], $variants); }
        }
        self::assertCount(8, $slugs);
        self::assertSame(['levels' => 30, 'points' => 18, 'relations' => 48, 'evaluations' => 6], $totals);
    }

    public function testLookupRequiresTheCorrectFormatAndKeepsDestinationsOutOfContent(): void
    {
        $library = $this->library();
        foreach (['', 'cas-0', 'cas-5', 'CAS-1', '../.env'] as $invalid) {
            self::assertNull($library->findFormat($invalid));
            self::assertNull($library->findExample($invalid, 'oscillateur-harmonique'));
        }
        foreach (['cas-1', 'cas-2', 'cas-3'] as $format) {
            self::assertNull($library->findExample($format, 'inconnue'));
            self::assertNull($library->findExample($format, '../.env'));
            foreach ($library->findFormat($format)['examples'] as $example) {
                self::assertSame($example, $library->findExample($format, $example['slug']));
                foreach (array_diff(['cas-1', 'cas-2', 'cas-3', 'cas-4'], [$format]) as $other) {
                    self::assertNull($library->findExample($other, $example['slug']), $other.'/'.$example['slug']);
                }
                $changed = $example;
                $changed['levels'][0]['href'] = '/destination-de-controle';
                self::assertArrayNotHasKey('href', $library->findExample($format, $example['slug'])['levels'][0]);
            }
        }
        $raw = json_decode(file_get_contents(dirname(__DIR__).'/config/content/exemples-analyse.json'), true, flags: JSON_THROW_ON_ERROR);
        $checkNoHref = function (array $value) use (&$checkNoHref): void {
            self::assertArrayNotHasKey('href', $value);
            foreach ($value as $item) { if (is_array($item)) { $checkNoHref($item); } }
        };
        $checkNoHref($raw);
    }

    public function testCaseFourPointsToExistingCompleteAnalyses(): void
    {
        $library = $this->library();
        $analyses = new CardAnalysisLibrary(dirname(__DIR__));
        $featured = $library->findFormat('cas-4')['examples'];
        self::assertSame(['oscillateur-harmonique', 'energie-onde-poynting'], array_column($featured, 'slug'));
        foreach ($featured as $example) {
            self::assertTrue($example['featured']);
            self::assertSame($example['slug'], $example['reading_card']);
            self::assertNotEmpty($example['title']);
            self::assertArrayNotHasKey('levels', $example);
            self::assertArrayNotHasKey('href', $example);
            self::assertNull($library->findExample('cas-4', $example['slug']));
            $analysis = $analyses->find($example['reading_card']);
            self::assertCount(6, $analysis['levels']);
            foreach ($analysis['levels'] as $level) { self::assertCount(6, $level['steps']); }
        }
    }

    public function testDisplayedExamplesAgreeWithIndependentNumericalCalculations(): void
    {
        $library = $this->library();
        $fr = static fn (float $value, int $decimals): string => number_format($value, $decimals, ',', '');

        $heating = $library->findExample('cas-1', 'chauffage-temperature');
        self::assertNotNull($heating);
        $capacity = 1.5 * 1.0 * 8.314;
        $temperature = 300.0 + 249.42 / $capacity;
        self::assertEqualsWithDelta(320.0, $temperature, 1e-12);
        self::assertStringContainsString('T_f = '.$fr($temperature, 0).' K', $heating['levels'][2]['output']);
        self::assertStringContainsString('ΔT = '.$fr($temperature - 300.0, 0).' K', $heating['levels'][1]['output']);

        $discharge = $library->findExample('cas-1', 'decharge-courant');
        self::assertNotNull($discharge);
        $tau = 0.200 / 20.0;
        $halfTime = $tau * log(2.0);
        $current = 0.400 * exp(-$halfTime / $tau);
        self::assertEqualsWithDelta(0.200, $current, 1e-14);
        self::assertEqualsWithDelta(6.931471805599453, $halfTime * 1000, 1e-12);
        self::assertStringContainsString('+'.$fr($current, 3).' A', $discharge['levels'][1]['output']);
        self::assertStringContainsString('+'.$fr($current, 3).' A', $discharge['levels'][2]['output']);
        self::assertStringContainsString($fr($halfTime * 1000, 5).' ms', $discharge['levels'][2]['action']);
        self::assertStringContainsString($fr($halfTime * 1000, 5).' ms', $discharge['basis']);

        $coulomb = $library->findExample('cas-1', 'charge-vers-champ');
        self::assertNotNull($coulomb);
        $radius = hypot(0.18, 0.24);
        $radialField = 8.99e9 * 3.00e-9 / ($radius * $radius);
        $ex = $radialField * 0.18 / $radius;
        $ey = $radialField * 0.24 / $radius;
        self::assertEqualsWithDelta(179.8, $ex, 1e-10);
        self::assertEqualsWithDelta(239.733333333333, $ey, 1e-10);
        self::assertEqualsWithDelta($radialField, hypot($ex, $ey), 1e-10);
        foreach ([1, 2] as $index) {
            self::assertStringContainsString('('.$fr($ex, 3).' ; '.$fr($ey, 3).' ; 0) N/C', $coulomb['levels'][$index]['output']);
            self::assertStringContainsString($fr($radialField, 4).' N/C', $coulomb['levels'][$index]['output']);
        }

        $hydrostatic = $library->findExample('cas-1', 'profondeur-vers-pression');
        self::assertNotNull($hydrostatic);
        $pressureDifference = 1000.0 * 9.81 * 1.50;
        self::assertEqualsWithDelta(14715.0, $pressureDifference, 1e-10);
        self::assertStringContainsString(number_format($pressureDifference, 0, ',', ' ').' Pa', $hydrostatic['levels'][1]['output']);
        self::assertStringContainsString($fr($pressureDifference / 1000, 3).' kPa', $hydrostatic['levels'][2]['output']);

        $oscillator = $library->findExample('cas-3', 'oscillateur-aller-retour');
        self::assertNotNull($oscillator);
        $mass = 0.200;
        $stiffness = 20.0;
        $damping = 0.400;
        $amplitude = 0.0500;
        $omega0 = sqrt($stiffness / $mass);
        $gamma = $damping / (2 * $mass);
        $omegaD = sqrt($omega0 ** 2 - $gamma ** 2);
        $period0 = 2 * M_PI / $omega0;
        $periodD = 2 * M_PI / $omegaD;
        $ratio = exp(-$gamma * $periodD);
        self::assertEqualsWithDelta(0.631483883399655, $periodD, 1e-12);
        self::assertEqualsWithDelta(0.531802082944259, $ratio, 1e-12);
        foreach (['T₀ ≈ '.$fr($period0, 6).' s', 'Td ≈ '.$fr($periodD, 6).' s', 'r ≈ '.$fr($ratio, 6)] as $text) {
            self::assertStringContainsString($text, $oscillator['levels'][2]['output']);
        }
        // Invert unrounded signatures; displayed decimals are not precision of measurements.
        $gammaRecovered = -log($ratio) / $periodD;
        $dampingRecovered = 2 * $mass * $gammaRecovered;
        $stiffnessRecovered = $mass * ((2 * M_PI / $periodD) ** 2 + $gammaRecovered ** 2);
        self::assertEqualsWithDelta($damping, $dampingRecovered, 1e-12);
        self::assertEqualsWithDelta($stiffness, $stiffnessRecovered, 1e-10);
        self::assertEqualsWithDelta($stiffness, $mass * (2 * M_PI / $period0) ** 2, 1e-10);
        self::assertStringContainsString('k = '.$fr($stiffnessRecovered, 1).' N·m⁻¹', $oscillator['levels'][4]['output']);
        self::assertStringContainsString('b = 0 ou '.$fr($dampingRecovered, 3).' kg·s⁻¹', $oscillator['levels'][4]['output']);
        $secondAmplitude = 2 * $amplitude;
        self::assertStringContainsString('T′ ≈ '.$fr($period0, 6).' s', $oscillator['levels'][5]['output']);
        self::assertStringContainsString('v′max = '.$fr($secondAmplitude * $omega0, 3).' m·s⁻¹', $oscillator['levels'][5]['output']);
        self::assertStringContainsString('E′m = '.$fr($stiffness * $secondAmplitude ** 2 / 2, 3).' J', $oscillator['levels'][5]['output']);

        $poynting = $library->findExample('cas-3', 'poynting-aller-retour');
        self::assertNotNull($poynting);
        $c = 299792458.0;
        $mu0 = 4 * M_PI * 1e-7;
        $epsilon0 = 1 / ($mu0 * $c ** 2);
        $fieldAmplitude = 3.00;
        $area = 0.0100;
        $duration = 1.00e-6;
        $intensity = $epsilon0 * $c * $fieldAmplitude ** 2 / 2;
        $energy = $intensity * $area * $duration;
        $inclinedEnergy = $energy * cos(M_PI / 3);
        self::assertEqualsWithDelta(0.0119448842824717, $intensity, 1e-14);
        self::assertEqualsWithDelta(1.19448842824717e-10, $energy, 1e-22);
        self::assertEqualsWithDelta(0.5, $inclinedEnergy / $energy, 1e-14);
        self::assertStringContainsString('I ≈ '.$fr($intensity, 10).' W·m⁻²', $poynting['levels'][2]['output']);
        self::assertStringContainsString('W₀ ≈ '.$fr($energy / 1e-10, 8).' × 10⁻¹⁰ J', $poynting['levels'][3]['output']);
        self::assertStringContainsString($fr($energy * 1e9, 9).' nJ', $poynting['levels'][3]['output']);
        self::assertStringContainsString('W₆₀ ≈ '.$fr($inclinedEnergy / 1e-11, 8).' × 10⁻¹¹ J', $poynting['levels'][5]['output']);
        $intensityRecovered = $inclinedEnergy / ($area * $duration * cos(M_PI / 3));
        $amplitudeRecovered = sqrt(2 * $intensityRecovered / ($epsilon0 * $c));
        self::assertEqualsWithDelta($fieldAmplitude, $amplitudeRecovered, 1e-12);
        self::assertStringContainsString('E0,rec = '.$fr($amplitudeRecovered, 2).' V·m⁻¹', $poynting['levels'][4]['output']);
    }

    private function assertPoint(array $point, string $context): void
    {
        foreach (['title', 'input', 'action', 'output'] as $field) { self::assertNotEmpty(trim($point[$field]), $context.' '.$point['coordinate'].' '.$field); }
        $stage = (new CardAnalysisLibrary(dirname(__DIR__)))->stages()[$point['id']];
        foreach (['label', 'name', 'color'] as $field) { self::assertSame($stage[$field], $point[$field], $context); }
        self::assertSame($point['label'], $point['subtitle']);
        self::assertContains($point['relation']['nature'], ['logique', 'calculatoire', 'observationnelle', 'interprétative', 'chronologique', 'causale'], $context);
        self::assertNotEmpty(trim($point['relation']['description']), $context);
        self::assertArrayNotHasKey('href', $point, $context);
    }

    private function assertAttributes(array $attributes, string $context): void
    {
        foreach (['input', 'output', 'comparison'] as $field) { self::assertNotEmpty(trim($attributes[$field]), $context.' attributs '.$field); }
    }

    private function assertEvaluation(array $evaluation, string $context): void
    {
        self::assertEqualsCanonicalizing(['object', 'conditions', 'criterion', 'finding'], array_keys($evaluation), $context);
        foreach ($evaluation as $text) { self::assertNotEmpty(trim($text), $context); }
    }
}
