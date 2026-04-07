import unittest
from unittest.mock import patch
import numpy as np

from ml.predict import engineer_features_single, get_risk_level, predict


class MockScaler:
    def transform(self, x):
        return x


class MockModel:
    def predict_proba(self, x):
        return np.array([[0.15, 0.85]])


class TestPredictHelpers(unittest.TestCase):
    def test_engineer_features_length_and_order(self):
        user = {
            'id': 'u1',
            'interactionCount': 10,
            'daysSinceLastActivity': 7,
            'sessionCount': 4,
            'accountAgeDays': 120,
        }

        features = engineer_features_single(user)

        self.assertEqual(len(features), 12)
        self.assertEqual(features[0], 10)  # interactionCount
        self.assertEqual(features[1], 7)   # daysSinceLastActivity
        self.assertEqual(features[2], 4)   # sessionCount

    def test_risk_level_mapping(self):
        thresholds = {
            'medium': 0.5,
            'high': 0.75,
            'critical': 0.9,
        }

        self.assertEqual(get_risk_level(0.2, thresholds), 'low')
        self.assertEqual(get_risk_level(0.5, thresholds), 'medium')
        self.assertEqual(get_risk_level(0.76, thresholds), 'high')
        self.assertEqual(get_risk_level(0.91, thresholds), 'critical')

    @patch('ml.predict.load_model')
    def test_predict_with_mocked_model(self, mocked_load_model):
        mocked_load_model.return_value = (
            MockModel(),
            MockScaler(),
            {
                'optimal_threshold': 0.4852,
                'risk_thresholds': {
                    'medium': 0.5,
                    'high': 0.75,
                    'critical': 0.9,
                },
            },
        )

        users = [
            {
                'id': 'u1',
                'interactionCount': 2,
                'daysSinceLastActivity': 45,
                'sessionCount': 1,
                'accountAgeDays': 180,
            }
        ]

        results = predict(users)

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], 'u1')
        self.assertEqual(results[0]['riskLevel'], 'high')
        self.assertTrue(results[0]['isChurned'])


if __name__ == '__main__':
    unittest.main()
