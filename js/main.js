// DataTables Initialization
$(document).ready(function() {
    // Stok Raporu Tablosu
    $('#stockTable').DataTable({
        responsive: true,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
        },
        pageLength: 5,
        lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
        order: [[3, 'desc']],
        columnDefs: [
            {
                targets: [2],
                render: function(data, type, row) {
                    return new Intl.NumberFormat('tr-TR').format(data);
                }
            },
            {
                targets: [3],
                render: function(data) {
                    return moment(data, 'DD/MM/YYYY').format('DD.MM.YYYY');
                }
            }
        ]
    });
});

// Top Products Chart
const ctx = document.getElementById('topProductsChart').getContext('2d');
const topProductsChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Cheesecake', 'Beef', 'Acuka', 'Fume Eti', 'Lotus', 'Strawberry', 'Tiramisu', 'Fit Cake', 'Rocher', 'Frappe'],
        datasets: [{
            label: 'Satış Miktarı',
            data: [300, 950, 350, 750, 400, 300, 450, 550, 850, 50],
            backgroundColor: '#FF4D26',
            borderRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Satış: ${context.raw} adet`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    callback: function(value) {
                        return value + ' adet';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    }
});

// Sipariş Durumu Renklendirme
function updateOrderStatus() {
    document.querySelectorAll('[data-status]').forEach(element => {
        const status = element.dataset.status;
        element.classList.add(`status-${status.toLowerCase()}`);
    });
}

// Badge Updates
function updateBadges() {
    const badges = document.querySelectorAll('.badge');
    badges.forEach(badge => {
        const count = parseInt(badge.textContent);
        if (count > 0) {
            badge.classList.add('bg-danger');
        } else {
            badge.classList.add('bg-secondary');
        }
    });
}

// Responsive Sidebar Toggle
document.getElementById('sidebarToggle')?.addEventListener('click', function() {
    document.body.classList.toggle('show-sidebar');
});

// Format Numbers
function formatNumber(number) {
    return new Intl.NumberFormat('tr-TR').format(number);
}

// Format Dates
function formatDate(date) {
    return moment(date).format('DD.MM.YYYY');
}

// Accordion State Management
function initAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        const buttons = accordion.querySelectorAll('.accordion-button');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const target = this.getAttribute('data-bs-target');
                const content = document.querySelector(target);
                
                // Toggle icon rotation
                this.classList.toggle('rotated');
                
                // Save state to localStorage
                const accordionId = accordion.id;
                const isExpanded = !this.classList.contains('collapsed');
                localStorage.setItem(`accordion_${accordionId}`, isExpanded);
            });
        });
    });

    // Restore accordion states from localStorage
    restoreAccordionStates();
}

function restoreAccordionStates() {
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        const accordionId = accordion.id;
        const isExpanded = localStorage.getItem(`accordion_${accordionId}`);
        
        if (isExpanded === 'false') {
            const button = accordion.querySelector('.accordion-button');
            const content = accordion.querySelector('.accordion-collapse');
            
            button.classList.add('collapsed');
            content.classList.remove('show');
        }
    });
}

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    updateBadges();
    updateOrderStatus();
    initAccordions();
    
    // Responsive davranış için event listener
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            document.body.classList.remove('show-sidebar');
        }
    });

    // Tooltips initialization
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
