"""Predictive module for agent reliability scoring."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from sklearn.ensemble import RandomForestClassifier


FEATURE_COLUMNS = ["execution_time", "error_count", "resource_usage"]


@dataclass
class AgentBehaviorPredictor:
    n_estimators: int = 100

    def __post_init__(self) -> None:
        self.model = RandomForestClassifier(n_estimators=self.n_estimators, random_state=42)
        self._trained = False

    def train_from_logs(self, logs_df: pd.DataFrame) -> None:
        X = logs_df[FEATURE_COLUMNS]
        y = logs_df["success_flag"]
        self.model.fit(X, y)
        self._trained = True

    def predict_failure_risk(self, agent_data: dict) -> float:
        if not self._trained:
            raise RuntimeError("Model is not trained yet.")

        features = [[agent_data.get(column, 0) for column in FEATURE_COLUMNS]]
        success_probability = float(self.model.predict_proba(features)[0][1])
        return 1.0 - success_probability
