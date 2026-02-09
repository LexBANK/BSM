import json
from pathlib import Path

import pandas as pd
import streamlit as st

st.title("📊 BSM Agent Activity Dashboard")

log_path = Path("logs/agent_runs.json")

if log_path.exists():
    logs = json.loads(log_path.read_text())
    df = pd.DataFrame(logs)
    st.dataframe(df)
else:
    st.warning("No logs detected yet.")
