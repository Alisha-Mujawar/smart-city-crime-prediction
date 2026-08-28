let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setupNavigation();
    setupComplaintForm();
    setupNotificationBell();
    setupProfileClick();
    loadDashboardData();
});

function loadUserData() {
    const userData = localStorage.getItem('user');
    if (userData) {
        currentUser = JSON.parse(userData);
        document.getElementById('user-name').textContent = currentUser.name || 'Citizen';
        document.getElementById('profile-name').textContent = currentUser.name || 'Citizen';
        document.getElementById('profile-email').textContent = currentUser.email || 'citizen@email.com';
        document.getElementById('profile-phone').textContent = currentUser.phone || '+1234567890';
        document.getElementById('profile-location').textContent = currentUser.location || 'Not Set';
        
        // Pre-fill complaint form with citizen info
        const citizenNameInput = document.getElementById('citizen-name');
        if (citizenNameInput) {
            citizenNameInput.value = currentUser.name || '';
        }
    } else {
        // Redirect to login if no user data
        window.location.href = '/auth?type=login';
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
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && !e.target.closest('.notification-bell')) {
            dropdown.style.display = 'none';
        }
    });
}

function toggleNotifications() {
    let dropdown = document.getElementById('notification-dropdown');
    
    if (!dropdown) {
        // Create notification dropdown
        dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
            </div>
            <div class="notification-list">
                <div class="notification-item">
                    <i class="fas fa-check-circle" style="color: #4caf50;"></i>
                    <div>
                        <p><strong>Complaint Resolved</strong></p>
                        <small>Your complaint #123 has been resolved</small>
                    </div>
                </div>
                <div class="notification-item">
                    <i class="fas fa-clock" style="color: #ff9800;"></i>
                    <div>
                        <p><strong>Complaint in Progress</strong></p>
                        <small>Your complaint #124 is being processed</small>
                    </div>
                </div>
                <div class="notification-item">
                    <i class="fas fa-info-circle" style="color: #2196f3;"></i>
                    <div>
                        <p><strong>Welcome to SmartCity</strong></p>
                        <small>Thank you for joining our platform</small>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dropdown);
    }
    
    // Toggle display
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        // Position the dropdown
        const bell = document.querySelector('.notification-bell');
        const rect = bell.getBoundingClientRect();
        dropdown.style.top = rect.bottom + 10 + 'px';
        dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    }
}

function setupProfileClick() {
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', () => {
            showSection('profile');
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
        'dashboard': 'Dashboard',
        'complaints': 'My Complaints',
        'new-complaint': 'New Complaint',
        'profile': 'My Profile',
        'settings': 'Settings'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || 'Dashboard';
    
    // Close sidebar on mobile
    document.querySelector('.sidebar').classList.remove('show');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('show');
}

function setupComplaintForm() {
    const complaintForm = document.getElementById('complaint-form');
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const complaintText = document.getElementById('complaint-text').value;
            const citizenName = document.getElementById('citizen-name').value;
            const location = document.getElementById('citizen-location').value;
            
            if (!complaintText || !citizenName || !location) {
                showFormMessage('Please fill all required fields', 'error');
                return;
            }
            
            const submitBtn = complaintForm.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('/api/submit-complaint', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        complaint_text: complaintText,
                        citizen_name: citizenName,
                        location: location,
                        citizen_email: currentUser?.email
                    })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.detail || 'Failed to submit complaint');
                }
                
                // Show success message in form (not popup)
                showFormMessage('Complaint submitted successfully!', 'success');
                
                // Reset form
                complaintForm.reset();
                
                // Pre-fill name again
                if (currentUser?.name) {
                    document.getElementById('citizen-name').value = currentUser.name;
                }
                
                // Reload dashboard data
                loadDashboardData();
                
                // Auto-hide message after 3 seconds
                setTimeout(() => {
                    hideFormMessage();
                }, 3000);
                
            } catch (error) {
                showFormMessage('Error: ' + error.message, 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

function showFormMessage(message, type) {
    let messageDiv = document.getElementById('form-message');
    
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'form-message';
        messageDiv.style.cssText = `
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-weight: 500;
            text-align: center;
        `;
        const form = document.getElementById('complaint-form');
        form.insertBefore(messageDiv, form.firstChild);
    }
    
    if (type === 'success') {
        messageDiv.style.backgroundColor = '#e8f5e9';
        messageDiv.style.color = '#4caf50';
        messageDiv.style.border = '1px solid #4caf50';
    } else {
        messageDiv.style.backgroundColor = '#fce4ec';
        messageDiv.style.color = '#e91e63';
        messageDiv.style.border = '1px solid #e91e63';
    }
    
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
}

function hideFormMessage() {
    const messageDiv = document.getElementById('form-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

async function loadDashboardData() {
    if (!currentUser?.email) return;
    
    try {
        const response = await fetch(`/api/citizen/complaints?email=${encodeURIComponent(currentUser.email)}`);
        const complaints = await response.json();
        
        // Update stats
        const totalComplaints = document.getElementById('total-my-complaints');
        const pendingComplaints = document.getElementById('pending-my-complaints');
        const resolvedComplaints = document.getElementById('resolved-my-complaints');
        
        if (totalComplaints) totalComplaints.textContent = complaints.length;
        if (pendingComplaints) pendingComplaints.textContent = complaints.filter(c => c.status === 'pending').length;
        if (resolvedComplaints) resolvedComplaints.textContent = complaints.filter(c => c.status === 'resolved').length;
        
        // Update complaints table
        const tbody = document.getElementById('my-complaints-body');
        if (tbody) {
            tbody.innerHTML = '';
            
            if (complaints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No complaints yet</td></tr>';
            } else {
                complaints.forEach(complaint => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>#${complaint.id}</td>
                        <td>${complaint.complaint_text.substring(0, 50)}...</td>
                        <td><strong>${complaint.predicted_crime || 'Pending'}</strong></td>
                        <td><span class="status-badge status-${complaint.status}">${complaint.status}</span></td>
                        <td>${new Date(complaint.timestamp).toLocaleDateString()}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }
        
        // Update recent complaints
        const recentList = document.getElementById('recent-complaints-list');
        if (recentList) {
            recentList.innerHTML = '';
            
            if (complaints.length === 0) {
                recentList.innerHTML = '<p style="text-align: center; color: #999;">No complaints yet</p>';
            } else {
                complaints.slice(0, 5).forEach(complaint => {
                    const item = document.createElement('div');
                    item.className = 'recent-item';
                    item.style.cssText = 'background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;';
                    
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong>${complaint.predicted_crime || 'Pending'}</strong>
                            <span class="status-badge status-${complaint.status}">${complaint.status}</span>
                        </div>
                        <p style="margin-bottom: 0.5rem; font-size: 0.9rem;">${complaint.complaint_text.substring(0, 80)}...</p>
                        <small style="color: #666;">${new Date(complaint.timestamp).toLocaleString()}</small>
                    `;
                    recentList.appendChild(item);
                });
            }
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/auth?type=login';
}