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
    setupNotificationBell();
    setupProfileClick();
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
        
        const adminZone = document.getElementById('admin-zone');
        if (adminZone) adminZone.value = currentAdmin.location || 'north';
        
        const adminFullname = document.getElementById('admin-fullname');
        if (adminFullname) adminFullname.value = currentAdmin.name || 'Zone Administrator';
        
        const adminEmail = document.getElementById('admin-email');
        if (adminEmail) adminEmail.value = currentAdmin.email || 'admin@smartcity.com';
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
            const section = item.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
}

function setupNotificationBell() {
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotifications();
        });
    }
    
    // Close notification dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('admin-notification-dropdown');
        if (dropdown && !e.target.closest('.notification-bell')) {
            dropdown.style.display = 'none';
        }
    });
}

function toggleNotifications() {
    let dropdown = document.getElementById('admin-notification-dropdown');
    
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'admin-notification-dropdown';
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <span id="notification-count" class="notification-count">0 new</span>
            </div>
            <div class="notification-list" id="notification-list">
                <div class="notification-item">
                    <i class="fas fa-info-circle" style="color: #2196f3;"></i>
                    <div>
                        <p><strong>Welcome Admin</strong></p>
                        <small>You are managing ${currentAdmin?.location || 'your'} zone</small>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dropdown);
    }
    
    // Update notifications based on complaints
    updateNotifications(dropdown);
    
    // Toggle display
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        const bell = document.querySelector('.notification-bell');
        const rect = bell.getBoundingClientRect();
        dropdown.style.top = rect.bottom + 10 + 'px';
        dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    }
}

function updateNotifications(dropdown) {
    const notificationList = dropdown.querySelector('.notification-list');
    const notificationCount = dropdown.querySelector('.notification-count');
    
    if (!notificationList) return;
    
    const pendingComplaints = complaintsData.filter(c => c.status === 'pending');
    const criticalComplaints = complaintsData.filter(c => c.confidence > 0.8 && c.status !== 'resolved');
    
    notificationList.innerHTML = '';
    
    if (criticalComplaints.length > 0) {
        criticalComplaints.forEach(complaint => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
                <div>
                    <p><strong>High Priority Complaint #${complaint.id}</strong></p>
                    <small>${complaint.predicted_crime} - ${complaint.location}</small>
                </div>
            `;
            notificationList.appendChild(item);
        });
    }
    
    if (pendingComplaints.length > 0) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <i class="fas fa-clock" style="color: #ff9800;"></i>
            <div>
                <p><strong>${pendingComplaints.length} Pending Complaints</strong></p>
                <small>Requires your attention</small>
            </div>
        `;
        notificationList.appendChild(item);
    }
    
    if (complaintsData.length === 0) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <i class="fas fa-info-circle" style="color: #2196f3;"></i>
            <div>
                <p><strong>No Complaints Yet</strong></p>
                <small>Complaints from citizens will appear here</small>
            </div>
        `;
        notificationList.appendChild(item);
    }
    
    if (notificationCount) {
        notificationCount.textContent = `${pendingComplaints.length} pending`;
    }
}

function setupProfileClick() {
    const adminAvatar = document.querySelector('.admin-avatar');
    if (adminAvatar) {
        adminAvatar.addEventListener('click', () => {
            showSection('settings');
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            filterComplaints(searchTerm);
        });
        
        // Add Enter key support
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = searchInput.value.toLowerCase().trim();
                filterComplaints(searchTerm);
            }
        });
    }
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            if (filter) {
                filterComplaintsByStatus(filter);
            }
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
                showToast('Please enter complaint text', 'error');
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
                
                const predictedCategory = document.getElementById('predicted-category');
                if (predictedCategory) {
                    predictedCategory.textContent = result.predicted_crime;
                }
                
                const confidencePercent = (result.confidence * 100).toFixed(2);
                const confidenceFill = document.getElementById('confidence-fill');
                if (confidenceFill) {
                    confidenceFill.style.width = confidencePercent + '%';
                    confidenceFill.textContent = confidencePercent + '%';
                }
                
                const confidenceText = document.getElementById('confidence-text');
                if (confidenceText) {
                    confidenceText.textContent = `Confidence: ${confidencePercent}%`;
                }
                
                showToast('Prediction completed!', 'success');
                
            } catch (error) {
                showToast('Error: ' + error.message, 'error');
            } finally {
                predictBtn.innerHTML = originalText;
                predictBtn.disabled = false;
            }
        });
    }
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
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = titles[sectionName] || 'Overview';
    }
    
    // Close sidebar on mobile
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
        sidebar.classList.remove('show');
    }
    
    // Load data for specific sections
    if (sectionName === 'analytics') {
        loadAnalytics();
    }
    if (sectionName === 'complaints') {
        renderComplaints(complaintsData);
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

async function loadDashboardData() {
    console.log('Loading dashboard data...');
    console.log('Current admin:', currentAdmin);
    
    if (!currentAdmin?.location) {
        console.log('No location found for admin');
        return;
    }
    
    try {
        const params = new URLSearchParams({
            location: currentAdmin.location
        });
        
        console.log('Fetching complaints for location:', currentAdmin.location);
        
        const response = await fetch(`/api/admin/complaints?${params}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to fetch complaints');
        }
        
        complaintsData = await response.json();
        console.log('Complaints loaded:', complaintsData.length);
        console.log('Complaints data:', complaintsData);
        
        // Update stats
        updateStats();
        
        // Update complaints table
        renderComplaints(complaintsData);
        
        // Update notification badge
        updateNotificationBadge();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading complaints: ' + error.message, 'error');
    }
}

function updateStats() {
    const total = complaintsData.length;
    const pending = complaintsData.filter(c => c.status === 'pending').length;
    const inProgress = complaintsData.filter(c => c.status === 'in_progress').length;
    const resolved = complaintsData.filter(c => c.status === 'resolved').length;
    const critical = complaintsData.filter(c => c.confidence > 0.8 && c.status !== 'resolved').length;
    
    console.log('Stats:', { total, pending, inProgress, resolved, critical });
    
    const totalComplaints = document.getElementById('total-complaints');
    const pendingComplaints = document.getElementById('pending-complaints');
    const resolvedComplaints = document.getElementById('resolved-complaints');
    const criticalComplaints = document.getElementById('critical-complaints');
    
    if (totalComplaints) totalComplaints.textContent = total;
    if (pendingComplaints) pendingComplaints.textContent = pending;
    if (resolvedComplaints) resolvedComplaints.textContent = resolved;
    if (criticalComplaints) criticalComplaints.textContent = critical;
    
    const pendingCount = document.getElementById('pending-count');
    if (pendingCount) pendingCount.textContent = pending;
}

function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const pending = complaintsData.filter(c => c.status === 'pending').length;
        badge.textContent = pending;
        if (pending === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'block';
        }
    }
}

function renderComplaints(complaints) {
    const tbody = document.getElementById('complaints-body');
    if (!tbody) {
        console.log('Complaints body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999; padding: 2rem;">No complaints found for this location</td></tr>';
        return;
    }
    
    complaints.forEach(complaint => {
        const row = document.createElement('tr');
        
        const statusDisplay = complaint.status.replace('_', ' ');
        const statusClass = `status-${complaint.status}`;
        const confidence = complaint.confidence ? (complaint.confidence * 100).toFixed(1) : '0.0';
        const crime = complaint.predicted_crime || 'Not Predicted';
        
        row.innerHTML = `
            <td>#${complaint.id}</td>
            <td>${complaint.complaint_text.substring(0, 50)}...</td>
            <td>${complaint.citizen_name || 'Anonymous'}</td>
            <td>${complaint.location || 'N/A'}</td>
            <td><strong>${crime}</strong></td>
            <td>${confidence}%</td>
            <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
            <td>
                <select class="status-select" data-complaint-id="${complaint.id}" onchange="handleStatusChange(this)">
                    <option value="pending" ${complaint.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in_progress" ${complaint.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="resolved" ${complaint.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                </select>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function handleStatusChange(selectElement) {
    const complaintId = selectElement.dataset.complaintId;
    const newStatus = selectElement.value;
    console.log('Status change requested:', complaintId, newStatus);
    
    // Call updateStatus with proper parameters
    updateStatus(complaintId, newStatus);
}

async function updateStatus(complaintId, status) {
    console.log('Updating complaint:', complaintId, 'to status:', status);
    
    try {
        // Use POST instead of PUT
        const response = await fetch(`/api/admin/update-status/${complaintId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: status
            })
        });
        
        const result = await response.json();
        console.log('Update result:', result);
        
        if (response.ok) {
            showToast('Status updated successfully!', 'success');
            loadDashboardData();
        } else {
            showToast('Failed: ' + (result.detail || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

function filterComplaints(searchTerm) {
    if (!searchTerm) {
        renderComplaints(complaintsData);
        return;
    }
    
    const filtered = complaintsData.filter(c => 
        (c.complaint_text && c.complaint_text.toLowerCase().includes(searchTerm)) ||
        (c.predicted_crime && c.predicted_crime.toLowerCase().includes(searchTerm)) ||
        (c.citizen_name && c.citizen_name.toLowerCase().includes(searchTerm)) ||
        (c.location && c.location.toLowerCase().includes(searchTerm))
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

function showToast(message, type) {
    let toast = document.getElementById('toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transition: all 0.3s ease;
            transform: translateX(100%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        `;
        document.body.appendChild(toast);
    }
    
    if (type === 'success') {
        toast.style.backgroundColor = '#4caf50';
    } else {
        toast.style.backgroundColor = '#f44336';
    }
    
    toast.textContent = message;
    toast.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
    }, 3000);
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