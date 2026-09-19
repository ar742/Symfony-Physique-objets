"""Types de paramètres indépendants : valeurs, graines et conservation du modèle."""

from copy import deepcopy
import json
import unittest

from physique_graphes import concordances as c
from physique_graphes.exemples_concordances import create_example
from physique_graphes.types_concordances import (
    MATRIX_TYPES, ENVIRONMENT_TYPES, apply_matrix_type, apply_environment_type,
    create_default_model,
)


NODES = tuple(str(i) for i in range(1, 9))
ACTIVE = {(edge["to"], edge["from"]) for edge in c.GRAPH["edges"]}


def sample_model():
    model = create_example("negative")
    model["environments"]["3"] = .37
    model["initial_controls"]["s5"] = .23
    model["attributes"] = {"auteur": "Exemple", "notes": ["paramètres supposés"]}
    model["domain"] = "signed"
    model["parameter_provenance"] = {"custom_metadata": {"keep": [1, 2]}}
    return model


class ConcordanceTypeTests(unittest.TestCase):
    def test_catalogs_share_identifiers_but_have_distinct_descriptions(self):
        expected = {"neutre", "positive", "inhibitory", "reference", "negative", "inactive",
                    "seed-7", "seed-8", "seed-34", "random-positive", "random-signed", "custom"}
        self.assertEqual(set(MATRIX_TYPES), expected)
        self.assertEqual(set(ENVIRONMENT_TYPES), expected)
        for key in expected:
            for catalog in (MATRIX_TYPES, ENVIRONMENT_TYPES):
                self.assertTrue(catalog[key]["title"])
                self.assertTrue(catalog[key]["description"])
                self.assertEqual(catalog[key]["generator"], key != "custom")
            self.assertNotEqual(MATRIX_TYPES[key]["description"], ENVIRONMENT_TYPES[key]["description"])

    def test_all_matrix_types_have_full_shape_diagonal_and_ranges(self):
        original = sample_model()
        for key in MATRIX_TYPES.keys() - {"custom"}:
            with self.subTest(type_id=key):
                result = apply_matrix_type(original, key, seed=12345)
                c.validate_model(result)
                self.assertEqual(set(result["epsilon"]), set(NODES))
                for n, row in result["epsilon"].items():
                    self.assertEqual(set(row), set(NODES))
                    self.assertEqual(row[n], 0)
                    self.assertTrue(all(-1 <= value <= 1 for value in row.values()))
                self.assertEqual(result["environments"], original["environments"])
                json.dumps(result, allow_nan=False)

    def test_all_environment_types_have_exactly_seven_values_in_signed_range(self):
        original = sample_model()
        for key in ENVIRONMENT_TYPES.keys() - {"custom"}:
            with self.subTest(type_id=key):
                result = apply_environment_type(original, key, seed=12345)
                c.validate_model(result)
                self.assertEqual(set(result["environments"]), set(NODES[1:]))
                self.assertTrue(all(-1 <= value <= 1 for value in result["environments"].values()))
                self.assertEqual(result["epsilon"], original["epsilon"])
                self.assertEqual(result["source"], 1)
                json.dumps(result, allow_nan=False)

    def test_constant_matrix_types_and_explicit_patterns(self):
        model = sample_model()
        for key, value in (("neutre", 0), ("positive", 1), ("inhibitory", -1)):
            matrix = apply_matrix_type(model, key)["epsilon"]
            for n in NODES:
                for origin in NODES:
                    self.assertEqual(matrix[n][origin], 0 if n == origin else value)
        for key, positions in (("reference", {("2", "1"), ("5", "1")}),
                               ("negative", {("8", "2"), ("8", "4"), ("8", "6")})):
            matrix = apply_matrix_type(model, key)["epsilon"]
            for n in NODES:
                for origin in NODES:
                    self.assertEqual(matrix[n][origin], -int((n, origin) in positions))

    def test_inactive_matrix_has_44_nonzero_inactive_coefficients_without_new_arcs(self):
        model = sample_model()
        inactive = apply_matrix_type(model, "inactive")
        null = apply_matrix_type(model, "neutre")
        matrix = inactive["epsilon"]
        self.assertEqual(sum(value == 1 for row in matrix.values() for value in row.values()), 44)
        self.assertEqual(len(ACTIVE), 12)
        self.assertTrue(all(matrix[n][origin] == 0 for n, origin in ACTIVE))
        for domain in ("signed", "rectified"):
            state, baseline = c.evaluate(inactive, domain=domain), c.evaluate(null, domain=domain)
            self.assertEqual(state, baseline)
            self.assertEqual(len(state["flows"]), 12)

    def test_constant_environment_types_and_explicit_negative_profile(self):
        model = sample_model()
        for key, value in (("neutre", 0), ("inactive", 0), ("positive", 1), ("reference", 1), ("inhibitory", -1)):
            result = apply_environment_type(model, key)
            self.assertEqual(result["environments"], {n: value for n in NODES[1:]})
        self.assertEqual(apply_environment_type(model, "negative")["environments"],
                         {n: 0 if n == "8" else 1 for n in NODES[1:]})

    def test_named_seed_matrices_match_existing_native_generator_without_changing_e(self):
        model = sample_model()
        for seed in (7, 8, 34):
            result = apply_matrix_type(model, f"seed-{seed}", seed=999)
            self.assertEqual(result["epsilon"], c.randomize(model, seed)["epsilon"])
            self.assertEqual(result["epsilon"], create_example(f"seed-{seed}")["epsilon"])
            self.assertEqual(result["environments"], model["environments"])
            self.assertNotEqual(set(result["environments"].values()), {.5})
            self.assertEqual(result["parameter_provenance"]["epsilon"]["seed"], seed)

    def test_random_matrix_reproducibility_and_positive_affine_mapping(self):
        model = sample_model()
        for seed in (0, 1, 34, 2**32 - 1):
            positive = apply_matrix_type(model, "random-positive", seed=seed)
            signed = apply_matrix_type(model, "random-signed", seed=seed)
            self.assertEqual(signed, apply_matrix_type(model, "random-signed", seed=seed))
            self.assertEqual(signed["epsilon"], c.randomize(model, seed)["epsilon"])
            for n in NODES:
                for origin in NODES:
                    if n != origin:
                        value = positive["epsilon"][n][origin]
                        self.assertTrue(0 <= value < 1)
                        self.assertEqual(2 * value - 1, signed["epsilon"][n][origin])
        self.assertNotEqual(apply_matrix_type(model, "random-signed", seed=34)["epsilon"],
                            apply_matrix_type(model, "random-signed", seed=35)["epsilon"])

    def test_environment_rng_order_exact_first_value_and_independence(self):
        model = sample_model()
        # Première transition LCG pour la graine7 : entier exact 1025555898.
        positive = apply_environment_type(model, "random-positive", seed=7)
        signed = apply_environment_type(model, "seed-7", seed=999)
        self.assertEqual(positive["environments"]["2"], 1025555898 / 2**32)
        self.assertEqual(signed["environments"]["2"], 2 * 1025555898 / 2**32 - 1)
        self.assertEqual(signed, apply_environment_type(model, "seed-7", seed=3))
        self.assertEqual(signed["environments"], apply_environment_type(model, "random-signed", seed=7)["environments"])
        for n in NODES[1:]:
            self.assertTrue(0 <= positive["environments"][n] < 1)
            self.assertEqual(2 * positive["environments"][n] - 1, signed["environments"][n])
        self.assertNotEqual(signed["environments"], apply_environment_type(model, "seed-8")["environments"])
        self.assertNotEqual(signed["environments"], apply_environment_type(model, "seed-34")["environments"])

    def test_generators_preserve_other_values_and_deepcopy_everything(self):
        model = sample_model()
        before = deepcopy(model)
        for function, target in ((apply_matrix_type, "epsilon"), (apply_environment_type, "environments")):
            result = function(model, "random-positive", seed=42)
            for key in model.keys() - {target, "parameter_provenance"}:
                self.assertEqual(result[key], model[key])
            self.assertEqual(result["parameter_provenance"]["custom_metadata"], model["parameter_provenance"]["custom_metadata"])
            result["attributes"]["notes"].append("copie seulement")
            result["parameter_provenance"]["custom_metadata"]["keep"].append(3)
            result["provenance"]["example_id"] = "historique modifié dans copie"
            result["initial_controls"]["s1"] = .123
            result["environments"]["2"] = .111
            result["epsilon"]["2"]["1"] = .222
            self.assertEqual(model, before)

    def test_generators_commute_and_keep_separate_component_provenance(self):
        model = sample_model()
        first = apply_environment_type(apply_matrix_type(model, "random-signed", seed=7), "random-signed", seed=34)
        second = apply_matrix_type(apply_environment_type(model, "random-signed", seed=34), "random-signed", seed=7)
        self.assertEqual(first, second)
        self.assertEqual(first["parameter_provenance"]["epsilon"]["seed"], 7)
        self.assertEqual(first["parameter_provenance"]["environments"]["seed"], 34)
        self.assertEqual(first["parameter_provenance"]["epsilon"]["draw_count"], 56)
        self.assertEqual(first["parameter_provenance"]["environments"]["draw_count"], 7)
        changed = apply_matrix_type(first, "neutre")
        self.assertEqual(changed["parameter_provenance"]["environments"], first["parameter_provenance"]["environments"])
        self.assertNotIn("seed", changed["parameter_provenance"]["epsilon"])

    def test_default_has_zero_e_seeded_matrix_and_original_source_and_shares(self):
        model = create_default_model(seed=7654)
        self.assertEqual(model, create_default_model(seed=7654))
        self.assertEqual(model["environments"], {n: 0 for n in NODES[1:]})
        self.assertEqual(model["epsilon"], c.randomize(c.create_scenario(), 7654)["epsilon"])
        self.assertEqual(model["source"], 1)
        self.assertEqual(model["initial_controls"], c.create_scenario()["initial_controls"])
        self.assertEqual(model["parameter_provenance"]["epsilon"]["type_id"], "random-signed")
        self.assertEqual(model["parameter_provenance"]["environments"]["type_id"], "neutre")

    def test_independent_types_do_not_inherit_coupled_example_maxima(self):
        model = apply_environment_type(c.create_scenario(), "neutre")
        reference_matrix = apply_matrix_type(model, "reference")
        negative_matrix = apply_matrix_type(model, "negative")
        self.assertEqual(c.evaluate(reference_matrix, domain="signed")["objective"], 0)
        self.assertEqual(c.evaluate(negative_matrix, domain="signed")["objective"], 0)
        restored_reference = apply_environment_type(reference_matrix, "reference")
        restored_negative = apply_environment_type(negative_matrix, "negative")
        self.assertEqual(c.evaluate(restored_reference, domain="signed")["objective"], .5)
        self.assertEqual(c.evaluate(restored_negative, domain="signed")["objective"], -1)
        positive_matrix = apply_matrix_type(model, "positive")
        self.assertGreater(c.evaluate(positive_matrix, domain="signed")["objective"], 0)

    def test_optional_fields_remain_absent_and_invalid_selection_fails(self):
        model = c.create_scenario()
        del model["initial_controls"]
        for function in (apply_matrix_type, apply_environment_type):
            self.assertNotIn("initial_controls", function(model, "positive"))
            for invalid in ("custom", "absent", "seed-9", None, [], 1):
                with self.subTest(function=function.__name__, selection=invalid), self.assertRaises(ValueError):
                    function(model, invalid)
            for seed in (-1, 2**32, .5, 7.0, True, None):
                with self.subTest(function=function.__name__, seed=seed), self.assertRaises(ValueError):
                    function(model, "random-signed", seed=seed)
            with self.assertRaises(ValueError):
                function([], "positive")


if __name__ == "__main__":
    unittest.main()
