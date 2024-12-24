$(document).ready(function() {
    // Initialize DataTable
    const orderTable = $('#orderTable').DataTable({
        responsive: true,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
        },
        columnDefs: [
            {
                targets: -1, // Last column (Sipariş Adedi)
                orderable: false
            }
        ],
        order: [[0, 'asc']] // Sort by stock code ascending
    });

    // Input validation
    $('input[type="number"]').on('input', function() {
        const value = parseInt($(this).val());
        const row = $(this).closest('tr');
        const min = parseInt(row.find('td:eq(4)').text());
        const max = parseInt(row.find('td:eq(5)').text());
        
        if (value < min) {
            $(this).addClass('is-invalid');
            $(this).attr('title', `Minimum sipariş adedi ${min} olmalıdır`);
        } else if (value > max) {
            $(this).addClass('is-invalid');
            $(this).attr('title', `Maksimum sipariş adedi ${max} olmalıdır`);
        } else {
            $(this).removeClass('is-invalid');
            $(this).removeAttr('title');
        }
    });

    // Create order button click handler
    $('#createOrder').click(function() {
        const orders = [];
        let hasError = false;

        // Collect all orders with values
        $('input[type="number"]').each(function() {
            const value = $(this).val();
            if (value && value.trim() !== '') {
                const row = $(this).closest('tr');
                const stockCode = row.find('td:eq(0)').text();
                const stockName = row.find('td:eq(1)').text();
                const quantity = parseInt(value);
                const min = parseInt(row.find('td:eq(4)').text());
                const max = parseInt(row.find('td:eq(5)').text());

                if (quantity < min || quantity > max) {
                    hasError = true;
                    $(this).addClass('is-invalid');
                    return false; // Break the loop
                }

                orders.push({
                    stockCode,
                    stockName,
                    quantity
                });
            }
        });

        if (hasError) {
            alert('Lütfen sipariş adetlerini minimum ve maksimum değerler arasında giriniz.');
            return;
        }

        if (orders.length === 0) {
            alert('Lütfen en az bir ürün için sipariş adedi giriniz.');
            return;
        }

        // Here you would typically send the orders to your backend
        console.log('Siparişler:', orders);
        
        // Redirect to orders page after successful creation
        // window.location.href = 'uretim-siparisleri.html';
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
