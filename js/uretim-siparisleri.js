// DataTables initialization
$(document).ready(async function() {
    // Initialize DataTables with empty data first
    const ordersTable = $('#ordersTable').DataTable({
        responsive: true,
        language: {
            "emptyTable": "Tabloda veri bulunmuyor",
            "info": "_TOTAL_ kayıttan _START_ - _END_ arası gösteriliyor",
            "infoEmpty": "Kayıt yok",
            "infoFiltered": "(_MAX_ kayıt içerisinden bulunan)",
            "lengthMenu": "Sayfada _MENU_ kayıt göster",
            "loadingRecords": "Yükleniyor...",
            "processing": "İşleniyor...",
            "search": "Ara:",
            "zeroRecords": "Eşleşen kayıt bulunamadı",
            "paginate": {
                "first": "İlk",
                "last": "Son",
                "next": "Sonraki",
                "previous": "Önceki"
            }
        },
        order: [[2, 'desc']], // Sort by order date descending
        columnDefs: [
            {
                targets: -1, // Last column (Actions)
                orderable: false
            }
        ],
        processing: true
    });

    // Function to load orders
    async function loadOrders() {
        try {
            const sessionId = localStorage.getItem('sessionId');
            console.log('Session ID:', sessionId);
            if (!sessionId) {
                console.error('No session ID found');
                alert('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
                return;
            }
            

            const response = await axios.get(
                "/b1s/v1/SQLQueries('OWTQ_LIST')/List?value1='PROD'&value2='1010'",
                {
                    withCredentials: true,
                    headers: {
                        'Accept': '*/*',
                        'Content-Type': 'application/json',
                        'Cookie': `B1SESSION=${sessionId}`
                    }
                }
            );

            console.log('Response:', response);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            console.log('Response data:', response.data);

            if (!response || !response.data || !response.data.value) {
                console.error('Invalid response format:', response);
                alert('Veri formatı geçersiz');
                return;
            }

            const orders = response.data.value;
            console.log('Fetched orders:', orders);
            console.log('Fetched orders length:', orders.length);

            // Clear existing data
            ordersTable.clear();

            // Add new data
            orders.forEach(order => {
                ordersTable.row.add([
                    order.CardName || '',
                    order.DocNum || '',
                    formatDate(order.DocDate) || '',
                    getStatusBadge(order.Status) || '',
                    `<div class="btn-group">
                        <button type="button" class="btn btn-sm btn-primary" onclick="viewOrder(${order.DocEntry})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-success" onclick="approveOrder(${order.DocEntry})">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    </div>`
                ]);
            });

            // Redraw the table
            ordersTable.draw();
        } catch (error) {
            console.error('Error fetching orders:', error);
            let errorMessage = 'Üretim siparişleri yüklenirken bir hata oluştu.';
            
            if (error.response) {
                console.error('Error response:', error.response);
                if (error.response.status === 401) {
                    errorMessage = 'Oturum süresi doldu. Lütfen tekrar giriş yapın.';
                } else if (error.response.status === 405) {
                    errorMessage = 'Sunucu isteği kabul etmedi. Lütfen daha sonra tekrar deneyin.';
                }
            }
            
            alert(errorMessage);
        }
    }

    // Initial load
    await loadOrders();

    // Refresh button handler
    $('#refreshButton').on('click', loadOrders);

    // Filter handling
    $('.form-select, .form-control').on('change', function() {
        ordersTable.draw();
    });

    // Add custom filtering
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        const supplier = $('select:eq(0)').val();
        const status = $('select:eq(1)').val();
        const startDate = $('input[type="date"]:eq(0)').val();
        const endDate = $('input[type="date"]:eq(1)').val();

        // If no filters are set, show all rows
        if (!supplier && !status && !startDate && !endDate) {
            return true;
        }

        let pass = true;

        // Supplier filter
        if (supplier && data[0].indexOf(supplier) === -1) {
            pass = false;
        }

        // Status filter
        if (status) {
            const rowStatus = data[3].toLowerCase();
            if (rowStatus.indexOf(status.toLowerCase()) === -1) {
                pass = false;
            }
        }

        // Date range filter
        if (startDate || endDate) {
            const rowDate = new Date(data[2]);
            if (startDate && new Date(startDate) > rowDate) {
                pass = false;
            }
            if (endDate && new Date(endDate) < rowDate) {
                pass = false;
            }
        }

        return pass;
    });

    // New Order Form handling
    $('#addProductRow').click(function() {
        const newRow = `
            <tr>
                <td><input type="text" class="form-control form-control-sm" required></td>
                <td><input type="text" class="form-control form-control-sm" required></td>
                <td><input type="number" class="form-control form-control-sm" required></td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        $('#productList').append(newRow);
    });

    // Remove product row
    $('#productList').on('click', '.btn-outline-danger', function() {
        $(this).closest('tr').remove();
    });

    // Form submission
    $('#newOrderForm').on('submit', function(e) {
        e.preventDefault();
        
        // Here you would typically send the form data to your backend
        // For now, we'll just show a success message and close the modal
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('newOrderModal'));
        modal.hide();
        
        // You can show a success message here
        // For example, using a toast notification
    });

    // Sidebar toggle for mobile
    $('#sidebarToggle').click(function() {
        $('body').toggleClass('show-sidebar');
    });

    // Close sidebar when clicking outside on mobile
    $(document).on('click', function(e) {
        if ($('body').hasClass('show-sidebar') && 
            !$(e.target).closest('.sidebar').length && 
            !$(e.target).closest('#sidebarToggle').length) {
            $('body').removeClass('show-sidebar');
        }
    });
});

// Format date for display
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR');
}

// Status badge helper
function getStatusBadge(status) {
    const statusMap = {
        'Open': '<span class="badge bg-warning">Açık</span>',
        'Closed': '<span class="badge bg-success">Kapalı</span>',
        'Cancelled': '<span class="badge bg-danger">İptal</span>',
        'Draft': '<span class="badge bg-secondary">Taslak</span>'
    };
    return statusMap[status] || `<span class="badge bg-info">${status}</span>`;
}

// View order details
async function viewOrder(docEntry) {
    try {
        const response = await api.makeAuthenticatedRequest(`b1s/v1/ProductionOrders(${docEntry})`);
        console.log('Order details:', response);
        // TODO: Show order details in a modal
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Sipariş detayları yüklenirken bir hata oluştu.');
    }
}

// Approve order
async function approveOrder(docEntry) {
    if (confirm('Bu siparişi onaylamak istediğinizden emin misiniz?')) {
        try {
            const response = await api.makeAuthenticatedRequest(
                `b1s/v1/ProductionOrders(${docEntry})`,
                'PATCH',
                { Status: 'Released' }
            );
            alert('Sipariş başarıyla onaylandı.');
            location.reload();
        } catch (error) {
            console.error('Error approving order:', error);
            alert('Sipariş onaylanırken bir hata oluştu.');
        }
    }
}
