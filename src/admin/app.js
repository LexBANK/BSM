async function loadData() {
  try {
    const token = document.getElementById("token").value;
    if (!token) {
      alert("Please enter an admin token");
      return;
    }
    
    const headers = { "x-admin-token": token };
    
    const agentsRes = await fetch("/api/admin/agents", { headers });
    if (!agentsRes.ok) {
      throw new Error(`Agents request failed: ${agentsRes.status} ${agentsRes.statusText}`);
    }
    const agents = await agentsRes.json();
    
    const knowledgeRes = await fetch("/api/admin/knowledge", { headers });
    if (!knowledgeRes.ok) {
      throw new Error(`Knowledge request failed: ${knowledgeRes.status} ${knowledgeRes.statusText}`);
    }
    const knowledge = await knowledgeRes.json();
    
    document.getElementById("agents").textContent = JSON.stringify(agents, null, 2);
    document.getElementById("knowledge").textContent = JSON.stringify(knowledge, null, 2);
    
    // Also load ORBIT status
    await loadOrbitStatus();
  } catch (error) {
    alert("Error loading data: " + error.message);
    console.error("Failed to load data:", error);
  }
}

async function loadOrbitStatus() {
  try {
    // Load status
    const statusRes = await fetch("/api/orbit/status");
    if (!statusRes.ok) {
      throw new Error(`ORBIT status request failed: ${statusRes.status}`);
    }
    const statusData = await statusRes.json();
    
    // Load history
    const historyRes = await fetch("/api/orbit/history?limit=10");
    if (!historyRes.ok) {
      throw new Error(`ORBIT history request failed: ${historyRes.status}`);
    }
    const historyData = await historyRes.json();
    
    // Update status display
    const status = statusData.status;
    const statusHtml = `
      <p><strong>Status:</strong> ${status.active ? '🟢 Active' : '🔴 Inactive'}</p>
      <p><strong>Telegram:</strong> ${status.telegramEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
      <p><strong>Last Health Check:</strong> ${status.lastHealthCheck || 'Never'}</p>
      <p><strong>Action Count:</strong> ${status.actionCount}</p>
      <p><strong>Uptime:</strong> ${Math.floor(status.uptime)} seconds</p>
    `;
    document.getElementById("orbit-status").innerHTML = statusHtml;
    
    // Update history display
    document.getElementById("orbit-history").textContent = JSON.stringify(historyData.history, null, 2);
    
  } catch (error) {
    document.getElementById("orbit-status").innerHTML = `<p style="color: red;">Error loading ORBIT status: ${error.message}</p>`;
    console.error("Failed to load ORBIT status:", error);
  }
}
