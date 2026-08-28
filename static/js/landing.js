// Landing page JavaScript

// Show role selection modal
function showRoleSelection() {
    const modal = document.getElementById('roleModal');
    if (modal) {
        modal.style.display = 'flex';
        // Add animation class
        modal.classList.add('animate__animated', 'animate__fadeIn');
    }
}

// Close role selection modal
function closeRoleModal() {
    const modal = document.getElementById('roleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Select role and redirect to auth page
function selectRole(role) {
    if (role === 'citizen') {
        window.location.href = '/auth?type=signup&role=citizen';
    } else if (role === 'admin') {
        window.location.href = '/auth?type=login&role=admin';
    }
}

// Go to login page
function goToLogin() {
    window.location.href = '/auth?type=login';
}

// Scroll to How It Works section
function scrollToHowItWorks() {
    const section = document.getElementById('how-it-works');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('roleModal');
    if (event.target === modal) {
        closeRoleModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeRoleModal();
    }
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Mobile menu toggle
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.toggle('show');
    }
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        const navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.remove('show');
        }
    });
});