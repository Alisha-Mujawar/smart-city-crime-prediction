let currentAdmin = null;
let complaintsData = [];
let charts = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAdminData();
    setupNavigation();
    setupSearch();
    setupFilters();
    setupPredictForm();
    displayCurrentDate();
    loadDashboardData();
});

function loadAdminData() {
    const adminData = localStorage.getItem('user');
    if (adminData) {
        currentAdmin = JSON.parse(adminData);
        
        // Check if user is admin
        if (currentAdmin.role !== 'admin') {
            window.location.href = '/auth?type=login';
            return;
        }
        
        document.getElementById('admin-name').textContent = currentAdmin.name || 'Admin';
        document.getElementById('admin-location').textContent = currentAdmin.location || 'North Zone';
        document.getElementById('admin-zone').value = currentAdmin.location || 'north';
        document.getElementById('admin-fullname').value = currentAdmin.name || 'Zone Administrator';
        document.getElementById('admin-email').value = currentAdmin.email || 'admin@smartcity.com';
    } else {
        // Redirect to login if no admin data
        window.location.href = '/auth?type=login';
    }
}

function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(item.dataset.section);
        });
    });
}

function showSection(sectionName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const titles = {
        'overview': 'Overview',
        'complaints': 'Complaints Management',
        'analytics': 'Crime Analytics',
        'predict': 'Predict Crime',
        'settings': 'Settings'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || 'Overview';
    
    // Close sidebar on mobile
    document.querySelector('.admin-sidebar').classList.remove('show');
    
    // Load data for specific sections
    if (sectionName === 'analytics') {
        loadAnalytics();
    }
}

function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('show');
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterComplaints(searchTerm);
        });
    }
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterComplaintsByStatus(btn.dataset.filter);
        });
    });
}

function setupPredictForm() {
    const predictForm = document.getElementById('predict-form');
    if (predictForm) {
        predictForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const complaintText = document.getElementById('predict-text').value;
            
            if (!complaintText.trim()) {
                alert('Please enter complaint text');
                return;
            }
            
            const predictBtn = predictForm.querySelector('.predict-btn');
            const originalText = predictBtn.innerHTML;
            predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Predicting...';
            predictBtn.disabled = true;
            
            try {
                const response = await fetch('/api/predict', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ complaint_text: complaintText })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.detail || 'Prediction failed');
                }
                
                // Show result
                const resultSection = document.getElementById('prediction-result');
                if (resultSection) {
                    resultSection.style.display = 'block';
                }
                
                document.getElementById('predicted-category').textContent = result.predicted_crime;
                
                const confidencePercent = (result.confidence * 100).toFixed(2);
                const confidenceFill = document.getElementById('confidence-fill');
                if (confidenceFill) {
                    confidenceFill.style.width = confidencePercent + '%';
                    confidenceFill.textContent = confidencePercent + '%';
                }
                
                document.getElementById('confidence-text').textContent = `Confidence: ${confidencePercent}%`;
                
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                predictBtn.innerHTML = originalText;
                predictBtn.disabled = false;
            }
        });
    }
}

async function loadDashboardData() {
    if (!currentAdmin?.location) return;
    
    try {
        const params = new URLSearchParams({
            location: currentAdmin.location
        });
        
        const response = await fetch(`/api/admin/complaints?${params}`);
        complaintsData = await response.json();
        
        // Update stats
        updateStats();
        
        // Update complaints table
        renderComplaints(complaintsData);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateStats() {
    const total = complaintsData.length;
    const pending = complaintsData.filter(c => c.status === 'pending').length;
    const resolved = complaintsData.filter(c => c.status === 'resolved').length;
    const critical = complaintsData.filter(c => c.confidence > 0.8).length;
    
    document.getElementById('total-complaints').textContent = total;
    document.getElementById('pending-complaints').textContent = pending;
    document.getElementById('resolved-complaints').textContent = resolved;
    document.getElementById('critical-complaints').textContent = critical;
    
    const pendingCount = document.getElementById('pending-count');
    if (pendingCount) {
        pendingCount.textContent = pending;
    }
}

function renderComplaints(complaints) {
    const tbody = document.getElementById('complaints-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No complaints for this location yet</td></tr>';
        return;
    }
    
    complaints.forEach(complaint => {
        const row = document.createElement('tr');
        const statusClass = `status-${complaint.status.replace('_', '-')}`;
        row.innerHTML = `
            <td>#${complaint.id}</td>
            <td>${complaint.complaint_text.substring(0, 50)}...</td>
            <td>${complaint.citizen_name || 'Anonymous'}</td>
            <td>${complaint.location || 'N/A'}</td>
            <td><strong>${complaint.predicted_crime || 'Pending'}</strong></td>
            <td>${(complaint.confidence * 100).toFixed(1)}%</td>
            <td><span class="status-badge ${statusClass}">${complaint.status}</span></td>
            <td>
                <button class="action-btn-sm btn-approve" onclick="updateStatus(${complaint.id}, 'resolved')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-btn-sm btn-reject" onclick="updateStatus(${complaint.id}, 'pending')">
                    <i class="fas fa-undo"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterComplaints(searchTerm) {
    const filtered = complaintsData.filter(c => 
        (c.complaint_text && c.complaint_text.toLowerCase().includes(searchTerm)) ||
        (c.predicted_crime && c.predicted_crime.toLowerCase().includes(searchTerm)) ||
        (c.citizen_name && c.citizen_name.toLowerCase().includes(searchTerm))
    );
    renderComplaints(filtered);
}

function filterComplaintsByStatus(status) {
    if (status === 'all') {
        renderComplaints(complaintsData);
    } else {
        const filtered = complaintsData.filter(c => c.status === status);
        renderComplaints(filtered);
    }
}

async function updateStatus(complaintId, status) {
    try {
        const response = await fetch(`/api/admin/update-status/${complaintId}?status=${status}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                location: currentAdmin?.location
            })
        });
        
        if (response.ok) {
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

async function loadAnalytics() {
    if (!currentAdmin?.location) return;
    
    try {
        const params = new URLSearchParams({
            location: currentAdmin.location,
            period: document.getElementById('month-select')?.value || 'current'
        });
        
        const response = await fetch(`/api/admin/analytics?${params}`);
        const analytics = await response.json();
        
        createCharts(analytics);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function createCharts(analytics) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // Category Distribution Chart
    const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
    if (categoryCtx) {
        charts.category = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: analytics.categories.map(c => c.category),
                datasets: [{
                    label: 'Number of Complaints',
                    data: analytics.categories.map(c => c.count),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#4facfe',
                        '#43e97b', '#fa709a', '#fee140', '#30cfd0'
                    ],
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    
    // Monthly Trend Chart
    const trendCtx = document.getElementById('trendChart')?.getContext('2d');
    if (trendCtx) {
        charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: analytics.trends.map(t => t.month),
                datasets: [{
                    label: 'Total Complaints',
                    data: analytics.trends.map(t => t.count),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }
    
    // Crime Ratio Pie Chart
    const ratioCtx = document.getElementById('ratioChart')?.getContext('2d');
    if (ratioCtx) {
        charts.ratio = new Chart(ratioCtx, {
            type: 'pie',
            data: {
                labels: analytics.categories.map(c => c.category),
                datasets: [{
                    data: analytics.categories.map(c => c.count),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#4facfe',
                        '#43e97b', '#fa709a', '#fee140', '#30cfd0'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Status Distribution Chart
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        charts.status = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'In Progress', 'Resolved'],
                datasets: [{
                    data: [
                        analytics.status.pending || 0,
                        analytics.status.in_progress || 0,
                        analytics.status.resolved || 0
                    ],
                    backgroundColor: ['#ff9800', '#2196f3', '#4caf50']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/auth?type=login';
}

// Auto refresh every 30 seconds
setInterval(() => {
    if (currentAdmin) {
        loadDashboardData();
    }
}, 30000);