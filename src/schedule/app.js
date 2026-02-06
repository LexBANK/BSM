const { createApp } = Vue;

createApp({
  data() {
    return {
      currentView: 'capacity',
      views: [
        { id: 'capacity', label: 'Capacity', icon: '📊' },
        { id: 'team', label: 'Team', icon: '👥' },
        { id: 'pto', label: 'PTO', icon: '🏖️' },
        { id: 'oncall', label: 'On-Call', icon: '📞' }
      ],
      
      // Data
      team: [],
      ptoRecords: [],
      onCallSchedules: [],
      capacity: null,
      
      // Modals
      showAddTeamModal: false,
      showAddPTOModal: false,
      showAddOnCallModal: false,
      
      // Forms
      teamForm: {
        name: '',
        email: '',
        role: '',
        active: true
      },
      ptoForm: {
        memberId: '',
        memberName: '',
        startDate: '',
        endDate: '',
        type: 'vacation',
        notes: ''
      },
      onCallForm: {
        memberId: '',
        memberName: '',
        startDate: '',
        endDate: '',
        type: 'primary',
        notes: ''
      },
      
      editingTeamMember: null,
      selectedWeek: '',
      
      // Toast
      toast: {
        show: false,
        message: '',
        type: 'success'
      },
      
      // Chart
      capacityChart: null
    };
  },
  
  computed: {
    activeTeam() {
      return this.team.filter(m => m.active);
    },
    
    sortedPTO() {
      return [...this.ptoRecords].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );
    },
    
    sortedOnCall() {
      return [...this.onCallSchedules].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );
    }
  },
  
  methods: {
    // API Methods
    async fetchTeam() {
      try {
        const res = await fetch('/api/schedule/team');
        const data = await res.json();
        if (data.success) {
          this.team = data.data;
        }
      } catch (error) {
        this.showToast('Failed to load team members', 'error');
        console.error('Error fetching team:', error);
      }
    },
    
    async fetchPTO() {
      try {
        const res = await fetch('/api/schedule/pto');
        const data = await res.json();
        if (data.success) {
          this.ptoRecords = data.data;
        }
      } catch (error) {
        this.showToast('Failed to load PTO records', 'error');
        console.error('Error fetching PTO:', error);
      }
    },
    
    async fetchOnCall() {
      try {
        const res = await fetch('/api/schedule/oncall');
        const data = await res.json();
        if (data.success) {
          this.onCallSchedules = data.data;
        }
      } catch (error) {
        this.showToast('Failed to load on-call schedules', 'error');
        console.error('Error fetching on-call:', error);
      }
    },
    
    async loadCapacity() {
      if (!this.selectedWeek) return;
      
      try {
        const res = await fetch(`/api/schedule/capacity/${this.selectedWeek}`);
        const data = await res.json();
        if (data.success) {
          this.capacity = data.data;
          this.$nextTick(() => {
            this.renderCapacityChart();
          });
        }
      } catch (error) {
        this.showToast('Failed to load capacity data', 'error');
        console.error('Error fetching capacity:', error);
      }
    },
    
    // Team Member Methods
    async saveTeamMember() {
      try {
        const url = this.editingTeamMember 
          ? `/api/schedule/team/${this.editingTeamMember.id}`
          : '/api/schedule/team';
        const method = this.editingTeamMember ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.teamForm)
        });
        
        const data = await res.json();
        if (data.success) {
          await this.fetchTeam();
          this.showToast(
            this.editingTeamMember ? 'Team member updated' : 'Team member added', 
            'success'
          );
          this.cancelTeamForm();
        } else {
          this.showToast(data.error || 'Failed to save team member', 'error');
        }
      } catch (error) {
        this.showToast('Failed to save team member', 'error');
        console.error('Error saving team member:', error);
      }
    },
    
    editTeamMember(member) {
      this.editingTeamMember = member;
      this.teamForm = {
        name: member.name,
        email: member.email,
        role: member.role,
        active: member.active
      };
      this.showAddTeamModal = true;
    },
    
    async deleteTeamMember(id) {
      if (!confirm('Are you sure you want to delete this team member?')) return;
      
      try {
        const res = await fetch(`/api/schedule/team/${id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          await this.fetchTeam();
          this.showToast('Team member deleted', 'success');
        }
      } catch (error) {
        this.showToast('Failed to delete team member', 'error');
        console.error('Error deleting team member:', error);
      }
    },
    
    cancelTeamForm() {
      this.showAddTeamModal = false;
      this.editingTeamMember = null;
      this.teamForm = {
        name: '',
        email: '',
        role: '',
        active: true
      };
    },
    
    // PTO Methods
    async savePTO() {
      try {
        const res = await fetch('/api/schedule/pto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.ptoForm)
        });
        
        const data = await res.json();
        if (data.success) {
          await this.fetchPTO();
          this.showToast('PTO request submitted', 'success');
          this.cancelPTOForm();
          if (this.currentView === 'capacity') {
            await this.loadCapacity();
          }
        } else {
          this.showToast(data.error || 'Failed to submit PTO request', 'error');
        }
      } catch (error) {
        this.showToast('Failed to submit PTO request', 'error');
        console.error('Error saving PTO:', error);
      }
    },
    
    async deletePTO(id) {
      if (!confirm('Are you sure you want to delete this PTO request?')) return;
      
      try {
        const res = await fetch(`/api/schedule/pto/${id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          await this.fetchPTO();
          this.showToast('PTO request deleted', 'success');
          if (this.currentView === 'capacity') {
            await this.loadCapacity();
          }
        }
      } catch (error) {
        this.showToast('Failed to delete PTO request', 'error');
        console.error('Error deleting PTO:', error);
      }
    },
    
    updatePTOMember() {
      const member = this.team.find(m => m.id === this.ptoForm.memberId);
      if (member) {
        this.ptoForm.memberName = member.name;
      }
    },
    
    cancelPTOForm() {
      this.showAddPTOModal = false;
      this.ptoForm = {
        memberId: '',
        memberName: '',
        startDate: '',
        endDate: '',
        type: 'vacation',
        notes: ''
      };
    },
    
    // On-Call Methods
    async saveOnCall() {
      try {
        const res = await fetch('/api/schedule/oncall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.onCallForm)
        });
        
        const data = await res.json();
        if (data.success) {
          await this.fetchOnCall();
          this.showToast('On-call schedule added', 'success');
          this.cancelOnCallForm();
          if (this.currentView === 'capacity') {
            await this.loadCapacity();
          }
        } else {
          this.showToast(data.error || 'Failed to add on-call schedule', 'error');
        }
      } catch (error) {
        this.showToast('Failed to add on-call schedule', 'error');
        console.error('Error saving on-call:', error);
      }
    },
    
    async deleteOnCall(id) {
      if (!confirm('Are you sure you want to delete this on-call schedule?')) return;
      
      try {
        const res = await fetch(`/api/schedule/oncall/${id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          await this.fetchOnCall();
          this.showToast('On-call schedule deleted', 'success');
          if (this.currentView === 'capacity') {
            await this.loadCapacity();
          }
        }
      } catch (error) {
        this.showToast('Failed to delete on-call schedule', 'error');
        console.error('Error deleting on-call:', error);
      }
    },
    
    updateOnCallMember() {
      const member = this.team.find(m => m.id === this.onCallForm.memberId);
      if (member) {
        this.onCallForm.memberName = member.name;
      }
    },
    
    cancelOnCallForm() {
      this.showAddOnCallModal = false;
      this.onCallForm = {
        memberId: '',
        memberName: '',
        startDate: '',
        endDate: '',
        type: 'primary',
        notes: ''
      };
    },
    
    // Utility Methods
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    },
    
    calculateDays(startDate, endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return days;
    },
    
    getMonday(date) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    },
    
    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    },
    
    renderCapacityChart() {
      if (!this.capacity) return;
      
      const canvas = document.getElementById('capacityChart');
      if (!canvas) return;
      
      // Destroy existing chart
      if (this.capacityChart) {
        this.capacityChart.destroy();
      }
      
      const ctx = canvas.getContext('2d');
      this.capacityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Available Capacity', 'PTO'],
          datasets: [{
            data: [this.capacity.availableCapacity, this.capacity.ptoCapacity],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 146, 60, 0.8)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(251, 146, 60, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#d1d5db',
                padding: 15,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.9)',
              titleColor: '#f9fafb',
              bodyColor: '#f9fafb',
              borderColor: '#374151',
              borderWidth: 1,
              padding: 12,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return context.label + ': ' + context.parsed + ' person-days';
                }
              }
            }
          }
        }
      });
    }
  },
  
  async mounted() {
    // Set current week as default
    const monday = this.getMonday(new Date());
    this.selectedWeek = monday.toISOString().split('T')[0];
    
    // Load all data
    await Promise.all([
      this.fetchTeam(),
      this.fetchPTO(),
      this.fetchOnCall(),
      this.loadCapacity()
    ]);
  }
}).mount('#app');
