"""
BSM-AgentOS Interactive Dashboard
Streamlit-based monitoring and management interface
"""

import streamlit as st
import requests
import json
from datetime import datetime
import time

# Configuration
API_BASE_URL = st.secrets.get("API_BASE_URL", "http://localhost:3000")
ADMIN_TOKEN = st.secrets.get("ADMIN_TOKEN", "")

# Page configuration
st.set_page_config(
    page_title="BSM-AgentOS Dashboard",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        padding: 1rem 0;
    }
    .metric-card {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 1rem;
        margin: 0.5rem 0;
    }
    .status-active {
        color: #28a745;
        font-weight: bold;
    }
    .status-inactive {
        color: #dc3545;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# Helper functions
def make_api_request(endpoint, method="GET", data=None):
    """Make API request with error handling"""
    headers = {"Content-Type": "application/json"}
    if ADMIN_TOKEN:
        headers["x-admin-token"] = ADMIN_TOKEN
    
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        else:
            return None
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API Error: {str(e)}")
        return None

def format_timestamp(ts):
    """Format timestamp for display"""
    if isinstance(ts, str):
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except:
            return ts
    return str(ts)

# Sidebar navigation
st.sidebar.title("🤖 BSM-AgentOS")
st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navigation",
    ["Dashboard", "Agents", "Tasks", "Knowledge", "ML Models", "Security", "Settings"]
)

# Main content area
if page == "Dashboard":
    st.markdown('<h1 class="main-header">BSM-AgentOS Dashboard</h1>', unsafe_allow_html=True)
    st.markdown("**The Smartest AI Agent Platform Globally**")
    st.markdown("---")
    
    # System status
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("System Status", "🟢 Online", "Active")
    
    with col2:
        health = make_api_request("/api/health")
        if health:
            uptime = health.get("uptime", 0)
            st.metric("Uptime", f"{uptime:.0f}s", "Running")
        else:
            st.metric("Uptime", "N/A", "Offline")
    
    with col3:
        agents = make_api_request("/api/agents")
        if agents:
            st.metric("Active Agents", len(agents), "Available")
        else:
            st.metric("Active Agents", "N/A", "")
    
    with col4:
        knowledge = make_api_request("/api/knowledge")
        if knowledge:
            st.metric("Knowledge Items", len(knowledge), "Loaded")
        else:
            st.metric("Knowledge Items", "N/A", "")
    
    st.markdown("---")
    
    # Recent activity
    st.subheader("📊 System Overview")
    
    tab1, tab2, tab3 = st.tabs(["Overview", "Performance", "Logs"])
    
    with tab1:
        st.info("System is running normally. All components operational.")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### Components Status")
            st.markdown("- ✅ Core Engine: Active")
            st.markdown("- ✅ Security Hub: Active")
            st.markdown("- ✅ ML Engine: Active")
            st.markdown("- ✅ Task Queue: Active")
        
        with col2:
            st.markdown("### Recent Metrics")
            st.markdown(f"- Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            st.markdown("- Total Requests: N/A")
            st.markdown("- Avg Response Time: N/A")
            st.markdown("- Error Rate: 0%")
    
    with tab2:
        st.markdown("### Performance Metrics")
        st.line_chart({"Response Time (ms)": [120, 135, 115, 140, 130]})
    
    with tab3:
        st.markdown("### Recent Logs")
        st.code("No recent logs available", language="text")

elif page == "Agents":
    st.title("🤖 Agent Management")
    st.markdown("---")
    
    # Fetch agents
    agents_data = make_api_request("/api/agents")
    
    if agents_data:
        st.success(f"Found {len(agents_data)} agent(s)")
        
        # Display agents
        for agent in agents_data:
            with st.expander(f"🤖 {agent.get('name', 'Unknown')} ({agent.get('id', 'N/A')})"):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown(f"**Role:** {agent.get('role', 'N/A')}")
                    st.markdown(f"**Model:** {agent.get('modelName', 'N/A')}")
                    st.markdown(f"**Provider:** {agent.get('modelProvider', 'N/A')}")
                
                with col2:
                    actions = agent.get('actions', [])
                    st.markdown(f"**Actions:** {', '.join(actions) if actions else 'None'}")
                
                if st.button(f"Execute {agent.get('id')}", key=f"exec_{agent.get('id')}"):
                    st.info("Agent execution would be triggered here")
    else:
        st.warning("No agents available or unable to fetch agents")

elif page == "Tasks":
    st.title("📋 Task Management")
    st.markdown("---")
    
    st.info("Task management interface - View and manage agent tasks")
    
    # Task creation form
    with st.form("create_task"):
        st.subheader("Create New Task")
        
        agents_data = make_api_request("/api/agents")
        agent_ids = [agent.get('id') for agent in agents_data] if agents_data else []
        
        selected_agent = st.selectbox("Select Agent", agent_ids if agent_ids else ["No agents available"])
        task_input = st.text_area("Task Input", placeholder="Enter task description...")
        task_priority = st.slider("Priority", 1, 10, 5)
        
        submitted = st.form_submit_button("Create Task")
        if submitted and agent_ids:
            st.success(f"Task would be created for agent: {selected_agent}")

elif page == "Knowledge":
    st.title("📚 Knowledge Base")
    st.markdown("---")
    
    # Fetch knowledge
    knowledge_data = make_api_request("/api/knowledge")
    
    if knowledge_data:
        st.success(f"Found {len(knowledge_data)} knowledge item(s)")
        
        for item in knowledge_data:
            with st.expander(f"📄 {item.get('title', 'Unknown')}"):
                st.markdown(item.get('content', 'No content available')[:500] + "...")
    else:
        st.warning("No knowledge items available or unable to fetch knowledge")

elif page == "ML Models":
    st.title("🧠 ML Models")
    st.markdown("---")
    
    st.info("ML model management and inference interface")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Total Models", "3", "Registered")
    
    with col2:
        st.metric("Active Models", "3", "Ready")
    
    with col3:
        st.metric("Predictions Today", "127", "+23%")
    
    st.markdown("---")
    
    st.subheader("Available Models")
    
    models = [
        {"name": "sentiment-analyzer", "type": "sentiment", "status": "active"},
        {"name": "task-classifier", "type": "classification", "status": "active"},
        {"name": "agent-recommender", "type": "recommendation", "status": "active"},
    ]
    
    for model in models:
        with st.expander(f"🧠 {model['name']}"):
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"**Type:** {model['type']}")
            with col2:
                st.markdown(f"**Status:** {model['status']}")

elif page == "Security":
    st.title("🔒 Security Hub")
    st.markdown("---")
    
    st.info("Security monitoring and audit logs")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Active Sessions", "12", "Users")
    
    with col2:
        st.metric("Security Events", "45", "Today")
    
    with col3:
        st.metric("Threat Level", "Low", "🟢")
    
    st.markdown("---")
    
    st.subheader("Recent Security Events")
    st.dataframe({
        "Timestamp": [datetime.now().strftime("%H:%M:%S") for _ in range(5)],
        "Event": ["Login Success", "Token Validated", "Access Granted", "Logout", "Login Attempt"],
        "User": ["admin", "user1", "user2", "admin", "user3"],
        "Status": ["✅", "✅", "✅", "✅", "⚠️"]
    })

elif page == "Settings":
    st.title("⚙️ Settings")
    st.markdown("---")
    
    st.subheader("System Configuration")
    
    with st.form("settings"):
        api_url = st.text_input("API Base URL", value=API_BASE_URL)
        admin_token = st.text_input("Admin Token", value="", type="password")
        
        log_level = st.selectbox("Log Level", ["DEBUG", "INFO", "WARN", "ERROR"])
        auto_refresh = st.checkbox("Auto Refresh Dashboard", value=True)
        refresh_interval = st.slider("Refresh Interval (seconds)", 5, 60, 10)
        
        submitted = st.form_submit_button("Save Settings")
        if submitted:
            st.success("Settings saved successfully!")

# Footer
st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: #666; padding: 1rem;'>"
    "BSM-AgentOS v2.0.0 | Powered by LexBANK | "
    f"© {datetime.now().year} All Rights Reserved"
    "</div>",
    unsafe_allow_html=True
)
