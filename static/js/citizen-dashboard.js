let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setupNavigation();
    setupComplaintForm();
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
        document.getElementById('citizen-name').value = currentUser.name || '';
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
                alert('Please fill all required fields');
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
                
                alert(`Complaint submitted successfully!\n\nPredicted Category: ${result.predicted_crime}\nConfidence: ${(result.confidence * 100).toFixed(2)}%\nComplaint ID: ${result.complaint_id}`);
                
                // Reset form
                complaintForm.reset();
                
                // Reload dashboard data
                loadDashboardData();
                
                // Show dashboard
                showSection('dashboard');
                
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

async function loadDashboardData() {
    if (!currentUser?.email) return;
    
    try {
        const response = await fetch(`/api/citizen/complaints?email=${encodeURIComponent(currentUser.email)}`);
        const complaints = await response.json();
        
        // Update stats
        document.getElementById('total-my-complaints').textContent = complaints.length;
        document.getElementById('pending-my-complaints').textContent = 
            complaints.filter(c => c.status === 'pending').length;
        document.getElementById('resolved-my-complaints').textContent = 
            complaints.filter(c => c.status === 'resolved').length;
        
        // Update complaints table
        const tbody = document.getElementById('my-complaints-body');
        if (tbody) {
            tbody.innerHTML = '';
            
            if (complaints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No complaints yet</td></tr>';
            } else {
                complaints.forEach(complaint => {
                    const row = document.createElement('tr');
                    const statusClass = `status-${complaint.status.replace('_', '-')}`;
                    row.innerHTML = `
                        <td>#${complaint.id}</td>
                        <td>${complaint.complaint_text.substring(0, 50)}...</td>
                        <td><strong>${complaint.predicted_crime || 'Pending'}</strong></td>
                        <td><span class="status-badge ${statusClass}">${complaint.status}</span></td>
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
                    
                    const statusClass = `status-${complaint.status.replace('_', '-')}`;
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong>${complaint.predicted_crime || 'Pending'}</strong>
                            <span class="status-badge ${statusClass}">${complaint.status}</span>
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