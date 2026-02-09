const { createApp } = Vue;

createApp({
  data() {
    return {
      selectedFile: null,
      uploading: false,
      analyzing: false,
      uploadId: null,
      analysis: null,
      error: null,
      chartInstance: null
    };
  },
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        // Check file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          this.error = 'File too large. Maximum size is 10MB.';
          return;
        }
        
        // Check file extension
        const allowedExtensions = ['.log', '.txt', '.json'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!allowedExtensions.includes(ext)) {
          this.error = 'Invalid file type. Only .log, .txt, and .json files are allowed.';
          return;
        }
        
        this.selectedFile = file;
        this.error = null;
      }
    },
    
    clearFile() {
      this.selectedFile = null;
      this.error = null;
      this.$refs.fileInput.value = '';
    },
    
    async uploadFile() {
      if (!this.selectedFile) return;
      
      this.uploading = true;
      this.error = null;
      
      try {
        // Upload file
        const formData = new FormData();
        formData.append('file', this.selectedFile);
        
        const uploadRes = await fetch('/api/logs/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || `Upload failed: ${uploadRes.status}`);
        }
        
        const uploadData = await uploadRes.json();
        this.uploadId = uploadData.uploadId;
        
        // Analyze file
        this.analyzing = true;
        const analyzeRes = await fetch('/api/logs/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            uploadId: this.uploadId,
            format: 'auto'
          })
        });
        
        if (!analyzeRes.ok) {
          const errData = await analyzeRes.json();
          throw new Error(errData.error || `Analysis failed: ${analyzeRes.status}`);
        }
        
        const analyzeData = await analyzeRes.json();
        this.analysis = analyzeData.analysis;
        
        // Render chart after DOM update
        this.$nextTick(() => {
          this.renderChart();
        });
        
      } catch (err) {
        console.error('Upload/analysis error:', err);
        this.error = err.message || 'Failed to upload and analyze file';
        this.uploadId = null;
        this.analysis = null;
      } finally {
        this.uploading = false;
        this.analyzing = false;
      }
    },
    
    reset() {
      this.selectedFile = null;
      this.uploadId = null;
      this.analysis = null;
      this.error = null;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
    },
    
    renderChart() {
      if (!this.analysis?.trends?.available || !this.$refs.trendsChart) {
        return;
      }
      
      const ctx = this.$refs.trendsChart.getContext('2d');
      
      // Destroy existing chart
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }
      
      const trendData = this.analysis.trends.data;
      
      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: trendData.map(d => this.formatTimestamp(d.timestamp)),
          datasets: [
            {
              label: 'Errors',
              data: trendData.map(d => d.errors),
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.3
            },
            {
              label: 'Warnings',
              data: trendData.map(d => d.warnings),
              borderColor: 'rgb(234, 179, 8)',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              tension: 0.3
            },
            {
              label: 'Total',
              data: trendData.map(d => d.total),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2.5,
          plugins: {
            legend: {
              labels: {
                color: 'rgb(209, 213, 219)'
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            x: {
              ticks: {
                color: 'rgb(156, 163, 175)',
                maxRotation: 45,
                minRotation: 45
              },
              grid: {
                color: 'rgba(75, 85, 99, 0.3)'
              }
            },
            y: {
              ticks: {
                color: 'rgb(156, 163, 175)'
              },
              grid: {
                color: 'rgba(75, 85, 99, 0.3)'
              },
              beginAtZero: true
            }
          }
        }
      });
    },
    
    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    formatTimestamp(timestamp) {
      try {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return timestamp;
      }
    }
  },
  
  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }
}).mount('#app');
