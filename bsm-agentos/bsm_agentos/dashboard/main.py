"""Streamlit dashboard for BSM-AgentOS."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st


st.set_page_config(page_title="BSM-AgentOS Dashboard", layout="wide")
st.title("🚀 BSM-AgentOS — Agent Performance Dashboard")

agents_path = Path("agents")
agent_files = list(agents_path.glob("*.agent.md"))

if agent_files:
    df = pd.DataFrame(
        [
            {
                "name": f.stem.replace(".agent", ""),
                "status": "healthy",
                "last_run": "N/A",
            }
            for f in agent_files
        ]
    )
else:
    df = pd.DataFrame([{"name": "No agents registered", "status": "unknown", "last_run": "N/A"}])

status_map = {"healthy": 1, "unknown": 0}
df_plot = df.assign(status_score=df["status"].map(status_map).fillna(0))

fig = px.bar(df_plot, x="name", y="status_score", title="Agent Health Status", labels={"status_score": "health"})
st.plotly_chart(fig, width="stretch")

with st.expander("📋 Agent List"):
    st.dataframe(df, width="stretch")

st.sidebar.header("Controls")
st.sidebar.button("🔄 Refresh Agents")
st.sidebar.button("📈 Export Metrics")
