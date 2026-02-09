"""Streamlit dashboard for BSM AgentOS run logs."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import streamlit as st

LOG_PATH = Path(__file__).resolve().parents[1] / "logs" / "agent_runs.json"


def load_runs() -> list[dict]:
    """Load run records from local JSON file."""
    if not LOG_PATH.exists():
        return []

    data = json.loads(LOG_PATH.read_text(encoding="utf-8"))
    runs = data.get("runs", [])
    return runs if isinstance(runs, list) else []


def main() -> None:
    """Render dashboard page."""
    st.set_page_config(page_title="BSM AgentOS Dashboard", layout="wide")
    st.title("BSM AgentOS Dashboard")

    runs = load_runs()
    st.metric("Total Runs", len(runs))

    if not runs:
        st.info("No run records found yet.")
        return

    frame = pd.DataFrame(runs)
    st.dataframe(frame, use_container_width=True)

    if "agentId" in frame.columns:
        st.subheader("Runs by Agent")
        counts = frame["agentId"].value_counts().rename_axis("agentId").reset_index(name="runs")
        st.bar_chart(counts.set_index("agentId"))


if __name__ == "__main__":
    main()
