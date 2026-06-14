// Admin Dashboard JavaScript
let currentSection = 'dashboard';
let charts = {};
let refreshInterval;
let systemData = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    initTheme();
    initEventListeners();
    loadDashboard();
    startAutoRefresh();
});

// Check admin authentication
async function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('adminEmail').textContent = user.email;
}

// Initialize event listeners
function initEventListeners() {
    // Navigation
    document.querySelectorAll('.admin-nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            switchSection(section);
        });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Refresh button
    document.getElementById('refreshData').addEventListener('click', () => {
        refreshCurrentSection();
    });

    // Back to app
    document.getElementById('backToApp').addEventListener('click', () => {
        window.location.href = 'chat.html';
    });

    // Logout
    document.getElementById('adminLogout').addEventListener('click', logout);

    // Search inputs
    document.addEventListener('input', (e) => {
        if (e.target.id === 'userSearch') {
            debounce(searchUsers, 500)(e.target.value);
        }
    });
}

// Switch between sections
function switchSection(section) {
    currentSection = section;
    
    // Update active nav item
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        users: 'User Management',
        conversations: 'AI Conversations',
        analytics: 'Analytics',
        subscriptions: 'Subscription Management',
        system: 'System Health',
        logs: 'Activity Logs',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;
    
    // Load section content
    loadSection(section);
}

// Load section content
async function loadSection(section) {
    const container = document.getElementById('contentContainer');
    
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'conversations':
            loadConversations();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'subscriptions':
            loadSubscriptions();
            break;
        case 'system':
            loadSystemHealth();
            break;
        case 'logs':
            loadActivityLogs();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Load Dashboard
async function loadDashboard() {
    const container = document.getElementById('contentContainer');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        systemData = data;
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-users"></i>
                        <span class="stat-change positive">
                            <i class="fas fa-arrow-up"></i> 12%
                        </span>
                    </div>
                    <div class="stat-value">${data.stats.totalUsers}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-comments"></i>
                        <span class="stat-change positive">
                            <i class="fas fa-arrow-up"></i> 8%
                        </span>
                    </div>
                    <div class="stat-value">${data.stats.totalMessages}</div>
                    <div class="stat-label">Total Messages</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-value">${data.stats.activeToday}</div>
                    <div class="stat-label">Active Today</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-crown"></i>
                    </div>
                    <div class="stat-value">${data.stats.proUsers}</div>
                    <div class="stat-label">Pro Users</div>
                </div>
            </div>

            <div class="charts-section">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>User Growth</h3>
                        <select id="userGrowthPeriod">
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                        </select>
                    </div>
                    <div class="chart-container">
                        <canvas id="userGrowthChart"></canvas>
                    </div>
                </div>
                
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Message Usage</h3>
                        <select id="messageUsagePeriod">
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                        </select>
                    </div>
                    <div class="chart-container">
                        <canvas id="messageUsageChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="table-section">
                <div class="table-header">
                    <h2>Recent Activity</h2>
                    <a href="#" onclick="switchSection('logs')" class="btn btn-outline">View All</a>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Action</th>
                            <th>Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.recentActivity.map(activity => `
                            <tr>
                                <td>${activity.user}</td>
                                <td>${activity.title}</td>
                                <td>${new Date(activity.lastActivity).toLocaleString()}</td>
                                <td><span class="user-status status-active">Active</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Initialize charts after DOM is updated
        initDashboardCharts();
        
    } catch (error) {
        showAlert('Error loading dashboard', 'error');
    }
}

// Initialize dashboard charts
function initDashboardCharts() {
    // User Growth Chart
    const ctx1 = document.getElementById('userGrowthChart')?.getContext('2d');
    if (ctx1) {
        if (charts.userGrowth) charts.userGrowth.destroy();
        
        charts.userGrowth = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'New Users',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Message Usage Chart
    const ctx2 = document.getElementById('messageUsageChart')?.getContext('2d');
    if (ctx2) {
        if (charts.messageUsage) charts.messageUsage.destroy();
        
        charts.messageUsage = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Messages',
                    data: [1200, 1900, 1500, 2100, 1800, 900, 600],
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Load Users
async function loadUsers(page = 1) {
    const container = document.getElementById('contentContainer');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users?page=${page}&limit=20`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        container.innerHTML = `
            <div class="table-section">
                <div class="table-header">
                    <h2>User Management</h2>
                    <div class="table-actions">
                        <div class="search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="userSearch" placeholder="Search users...">
                        </div>
                        <button class="filter-btn">
                            <i class="fas fa-filter"></i>
                            Filter
                        </button>
                        <button class="btn btn-primary" onclick="exportUsers()">
                            <i class="fas fa-download"></i>
                            Export
                        </button>
                    </div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Subscription</th>
                            <th>Messages</th>
                            <th>Joined</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.users.map(user => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas fa-user-circle" style="font-size: 2rem; color: var(--primary-color);"></i>
                                        <div>
                                            <strong>${user.email.split('@')[0]}</strong>
                                            <small style="display: block; color: var(--gray-500);">ID: ${user._id.slice(-6)}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>${user.email}</td>
                                <td>
                                    <span class="user-status ${user.lastLogin ? 'status-active' : 'status-inactive'}">
                                        ${user.lastLogin ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <span class="subscription-badge ${user.subscriptionType === 'pro' ? 'badge-pro' : 'badge-free'}">
                                        ${user.subscriptionType}
                                    </span>
                                </td>
                                <td>${user.totalMessages || 0}</td>
                                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="action-btn view" onclick="viewUser('${user._id}')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="action-btn edit" onclick="editUser('${user._id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="action-btn delete" onclick="deleteUser('${user._id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Pagination -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                    <div>
                        Showing ${(data.pagination.page - 1) * data.pagination.limit + 1} to 
                        ${Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} 
                        of ${data.pagination.total} users
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline" ${data.pagination.page === 1 ? 'disabled' : ''} 
                                onclick="loadUsers(${data.pagination.page - 1})">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span style="padding: 0.5rem 1rem;">Page ${data.pagination.page} of ${data.pagination.pages}</span>
                        <button class="btn btn-outline" ${data.pagination.page === data.pagination.pages ? 'disabled' : ''} 
                                onclick="loadUsers(${data.pagination.page + 1})">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        showAlert('Error loading users', 'error');
    }
}

// Load Conversations
async function loadConversations() {
    const container = document.getElementById('contentContainer');
    
    container.innerHTML = `
        <div class="conversations-panel">
            <div class="conversations-list" id="conversationsList">
                <div style="padding: 1rem; text-align: center;">
                    <i class="fas fa-spinner fa-spin"></i> Loading conversations...
                </div>
            </div>
            <div class="conversation-detail" id="conversationDetail">
                <div style="text-align: center; color: var(--gray-500); padding: 2rem;">
                    <i class="fas fa-comment-dots" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Select a conversation to view details</p>
                </div>
            </div>
        </div>
    `;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/conversations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const conversations = await response.json();
        
        const listElement = document.getElementById('conversationsList');
        listElement.innerHTML = conversations.map(conv => `
            <div class="conversation-item" onclick="viewConversation('${conv._id}')">
                <div class="conversation-user">
                    <i class="fas fa-user-circle"></i>
                    <h4>${conv.userEmail}</h4>
                </div>
                <div class="conversation-preview">
                    ${conv.lastMessage || 'No messages'}
                </div>
                <div class="conversation-meta">
                    <span><i class="far fa-clock"></i> ${new Date(conv.lastActivity).toLocaleString()}</span>
                    <span>${conv.messageCount} msgs</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        showAlert('Error loading conversations', 'error');
    }
}

// View specific conversation
async function viewConversation(conversationId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/conversations/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const conversation = await response.json();
        
        const detailElement = document.getElementById('conversationDetail');
        detailElement.innerHTML = `
            <div class="conversation-messages">
                ${conversation.messages.map(msg => `
                    <div class="conv-message ${msg.role}">
                        <div class="conv-message-avatar">
                            <i class="fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                        </div>
                        <div class="conv-message-content">
                            <strong>${msg.role === 'user' ? 'User' : 'MISS AI'}</strong>
                            <p>${msg.content}</p>
                            <small style="opacity: 0.7;">
                                <i class="far fa-clock"></i> ${new Date(msg.timestamp).toLocaleString()}
                                ${msg.tokens ? ` | ${msg.tokens} tokens` : ''}
                            </small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        showAlert('Error loading conversation', 'error');
    }
}

// Load Analytics
async function loadAnalytics() {
    const container = document.getElementById('contentContainer');
    
    container.innerHTML = `
        <div class="charts-section">
            <div class="chart-card">
                <div class="chart-header">
                    <h3>User Acquisition</h3>
                </div>
                <div class="chart-container">
                    <canvas id="acquisitionChart"></canvas>
                </div>
            </div>
            
            <div class="chart-card">
                <div class="chart-header">
                    <h3>User Retention</h3>
                </div>
                <div class="chart-container">
                    <canvas id="retentionChart"></canvas>
                </div>
            </div>
        </div>

        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>Top Users by Messages</h3>
                <div class="analytics-list" id="topUsers">
                    <div class="analytics-item">
                        <span>Loading...</span>
                    </div>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Popular Topics</h3>
                <div class="analytics-list" id="popularTopics">
                    <div class="analytics-item">
                        <span>Loading...</span>
                    </div>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Subscription Conversion</h3>
                <div class="chart-container" style="height: 200px;">
                    <canvas id="conversionChart"></canvas>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>Daily Active Users</h3>
                <div class="stat-value" id="dailyActiveUsers">-</div>
                <div class="chart-container" style="height: 150px;">
                    <canvas id="dailyActiveChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Load analytics data
    loadAnalyticsData();
}

// Load Subscriptions
async function loadSubscriptions() {
    const container = document.getElementById('contentContainer');
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="stat-value" id="proCount">-</div>
                <div class="stat-label">Pro Users</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-user"></i>
                </div>
                <div class="stat-value" id="freeCount">-</div>
                <div class="stat-label">Free Users</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-value" id="monthlyRevenue">-</div>
                <div class="stat-label">Monthly Revenue</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <i class="fas fa-percent"></i>
                </div>
                <div class="stat-value" id="conversionRate">-</div>
                <div class="stat-label">Conversion Rate</div>
            </div>
        </div>

        <div class="table-section">
            <div class="table-header">
                <h2>Active Subscriptions</h2>
                <button class="btn btn-primary" onclick="exportSubscriptions()">
                    <i class="fas fa-download"></i>
                    Export
                </button>
            </div>
            <table class="data-table" id="subscriptionsTable">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Plan</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Payment Method</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="7" style="text-align: center;">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    loadSubscriptionData();
}

// Load System Health
async function loadSystemHealth() {
    const container = document.getElementById('contentContainer');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/health', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const health = await response.json();
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="stat-value ${health.database === 'connected' ? 'text-success' : 'text-danger'}">
                        ${health.database}
                    </div>
                    <div class="stat-label">Database Status</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-microchip"></i>
                    </div>
                    <div class="stat-value ${health.ai === 'operational' ? 'text-success' : 'text-danger'}">
                        ${health.ai}
                    </div>
                    <div class="stat-label">AI Service</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-value">${formatUptime(health.uptime)}</div>
                    <div class="stat-label">Uptime</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-header">
                        <i class="fas fa-memory"></i>
                    </div>
                    <div class="stat-value">${formatMemory(health.memory)}</div>
                    <div class="stat-label">Memory Usage</div>
                </div>
            </div>

            <div class="table-section">
                <div class="table-header">
                    <h2>System Metrics</h2>
                    <button class="btn btn-primary" onclick="downloadSystemLogs()">
                        <i class="fas fa-download"></i>
                        Download Logs
                    </button>
                </div>
                <div class="system-metrics">
                    <div class="metric-item">
                        <span>CPU Usage</span>
                        <div class="progress-bar">
                            <div class="progress" style="width: 45%"></div>
                        </div>
                        <span>45%</span>
                    </div>
                    <div class="metric-item">
                        <span>Memory Usage</span>
                        <div class="progress-bar">
                            <div class="progress" style="width: 62%"></div>
                        </div>
                        <span>62%</span>
                    </div>
                    <div class="metric-item">
                        <span>Disk Usage</span>
                        <div class="progress-bar">
                            <div class="progress" style="width: 38%"></div>
                        </div>
                        <span>38%</span>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        showAlert('Error loading system health', 'error');
    }
}

// Load Activity Logs
async function loadActivityLogs() {
    const container = document.getElementById('contentContainer');
    
    container.innerHTML = `
        <div class="table-section">
            <div class="table-header">
                <h2>Activity Logs</h2>
                <div class="table-actions">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Search logs...">
                    </div>
                    <select class="filter-btn">
                        <option value="all">All Events</option>
                        <option value="login">Logins</option>
                        <option value="message">Messages</option>
                        <option value="subscription">Subscriptions</option>
                    </select>
                    <button class="btn btn-primary" onclick="exportLogs()">
                        <i class="fas fa-download"></i>
                        Export
                    </button>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Event Type</th>
                        <th>Description</th>
                        <th>IP Address</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="logsTableBody">
                    <tr>
                        <td colspan="6" style="text-align: center;">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    loadLogsData();
}

// Load Settings
function loadSettings() {
    const container = document.getElementById('contentContainer');
    
    container.innerHTML = `
        <div class="table-section">
            <h2>System Settings</h2>
            <form id="settingsForm" style="max-width: 600px;">
                <div class="form-group">
                    <label>Free Tier Daily Limit</label>
                    <input type="number" id="freeLimit" value="10" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Rate Limit (requests/minute)</label>
                    <input type="number" id="rateLimit" value="10" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Max Tokens per Response</label>
                    <input type="number" id="maxTokens" value="1000" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Temperature</label>
                    <input type="range" id="temperature" min="0" max="2" step="0.1" value="0.7">
                    <span id="tempValue">0.7</span>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="maintenanceMode">
                        Maintenance Mode
                    </label>
                </div>
                
                <button type="submit" class="btn btn-primary">Save Settings</button>
            </form>
        </div>
    `;

    document.getElementById('temperature').addEventListener('input', (e) => {
        document.getElementById('tempValue').textContent = e.target.value;
    });
}

// Analytics Data
async function loadAnalyticsData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/analytics', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        // Update top users
        const topUsersEl = document.getElementById('topUsers');
        topUsersEl.innerHTML = data.topUsers.map(user => `
            <div class="analytics-item">
                <span>${user.email}</span>
                <span><strong>${user.messageCount}</strong> msgs</span>
            </div>
        `).join('');
        
        // Update popular topics
        const topicsEl = document.getElementById('popularTopics');
        topicsEl.innerHTML = data.popularTopics.map(topic => `
            <div class="analytics-item">
                <span>${topic.topic}</span>
                <span><strong>${topic.count}</strong> times</span>
            </div>
        `).join('');
        
        // Create conversion chart
        const ctx = document.getElementById('conversionChart')?.getContext('2d');
        if (ctx) {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Free', 'Pro'],
                    datasets: [{
                        data: [data.stats.freeUsers, data.stats.proUsers],
                        backgroundColor: ['#9ca3af', '#6366f1']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Subscription Data
async function loadSubscriptionData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/subscriptions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        // Update stats
        document.getElementById('proCount').textContent = data.stats.proUsers;
        document.getElementById('freeCount').textContent = data.stats.freeUsers;
        document.getElementById('monthlyRevenue').textContent = `$${data.stats.monthlyRevenue}`;
        document.getElementById('conversionRate').textContent = `${data.stats.conversionRate}%`;
        
        // Update table
        const tableBody = document.querySelector('#subscriptionsTable tbody');
        tableBody.innerHTML = data.subscriptions.map(sub => `
            <tr>
                <td>${sub.userEmail}</td>
                <td><span class="subscription-badge badge-pro">${sub.plan}</span></td>
                <td>${new Date(sub.startDate).toLocaleDateString()}</td>
                <td>${new Date(sub.endDate).toLocaleDateString()}</td>
                <td><span class="user-status status-active">Active</span></td>
                <td>${sub.paymentMethod || 'Stripe'}</td>
                <td>
                    <button class="action-btn edit" onclick="cancelSubscription('${sub.id}')">
                        <i class="fas fa-ban"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

// Logs Data
async function loadLogsData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/logs', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const logs = await response.json();
        
        const tableBody = document.getElementById('logsTableBody');
        tableBody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.userEmail}</td>
                <td><span class="subscription-badge">${log.eventType}</span></td>
                <td>${log.description}</td>
                <td>${log.ipAddress}</td>
                <td>
                    <span class="user-status ${log.status === 'success' ? 'status-active' : 'status-inactive'}">
                        ${log.status}
                    </span>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// User Actions
async function viewUser(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const user = await response.json();
        
        const modalBody = document.getElementById('userModalBody');
        modalBody.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <i class="fas fa-user-circle" style="font-size: 5rem; color: var(--primary-color);"></i>
                <h3>${user.email}</h3>
                <p>User ID: ${user._id}</p>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: repeat(2,1fr);">
                <div class="stat-card" style="padding: 1rem;">
                    <div class="stat-label">Subscription</div>
                    <div class="stat-value" style="font-size: 1.5rem;">${user.subscriptionType}</div>
                </div>
                <div class="stat-card" style="padding: 1rem;">
                    <div class="stat-label">Messages</div>
                    <div class="stat-value" style="font-size: 1.5rem;">${user.messageCount}</div>
                </div>
                <div class="stat-card" style="padding: 1rem;">
                    <div class="stat-label">Joined</div>
                    <div class="stat-value" style="font-size: 1rem;">${new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="stat-card" style="padding: 1rem;">
                    <div class="stat-label">Last Login</div>
                    <div class="stat-value" style="font-size: 1rem;">${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
                </div>
            </div>
            
            <h4 style="margin: 1rem 0;">Recent Activity</h4>
            <div id="userActivity">
                ${user.recentActivity ? user.recentActivity.map(activity => `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--gray-400);">
                        <small>${new Date(activity.timestamp).toLocaleString()}</small>
                        <p>${activity.action}</p>
                    </div>
                `).join('') : '<p>No recent activity</p>'}
            </div>
        `;
        
        document.getElementById('userModal').classList.add('show');
        
    } catch (error) {
        showAlert('Error loading user details', 'error');
    }
}

function editUser(userId) {
    viewUser(userId);
    // Enable editing mode
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
        } else {
            throw new Error('Failed to delete user');
        }
        
    } catch (error) {
        showAlert('Error deleting user', 'error');
    }
}

// Export functions
function exportUsers() {
    showAlert('Exporting users...', 'info');
    // Implement CSV export
}

function exportSubscriptions() {
    showAlert('Exporting subscriptions...', 'info');
}

function exportLogs() {
    showAlert('Exporting logs...', 'info');
}

function downloadSystemLogs() {
    showAlert('Downloading system logs...', 'info');
}

// Cancel subscription
function cancelSubscription(subscriptionId) {
    if (confirm('Are you sure you want to cancel this subscription?')) {
        showAlert('Subscription cancelled', 'success');
    }
}

// Search users (debounced)
function searchUsers(query) {
    if (query.length > 2) {
        console.log('Searching for:', query);
        // Implement search
    }
}

// Refresh current section
function refreshCurrentSection() {
    loadSection(currentSection);
}

// Auto-refresh
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        if (currentSection === 'dashboard' || currentSection === 'system') {
            refreshCurrentSection();
        }
    }, 30000); // Refresh every 30 seconds
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// Utility Functions
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
}

function formatMemory(memory) {
    const mb = memory / 1024 / 1024;
    return `${Math.round(mb)} MB`;
}

function showAlert(message, type = 'info') {
    const modal = document.getElementById('alertModal');
    document.getElementById('alertTitle').textContent = 
        type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info';
    document.getElementById('alertMessage').textContent = message;
    modal.classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});