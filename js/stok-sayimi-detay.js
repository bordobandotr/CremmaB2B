// js/stok-sayimi-detay.js
// Stok sayımı detay ekranı için veri çekme ve ekrana yazma

$(document).ready(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const docNum = urlParams.get('docNum');
    const sessionId = localStorage.getItem('sessionId');
    let dataTable;

    function formatDate(dateStr) {
        if (!dateStr) return '';
        // 20250102 gibi yyyymmdd formatı
        if (/^\d{8}$/.test(dateStr)) {
            const yil = dateStr.substring(0, 4);
            const ayNum = parseInt(dateStr.substring(4, 6), 10);
            const gunNum = parseInt(dateStr.substring(6, 8), 10);
            const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            const ay = aylar[ayNum - 1] || '';
            return `${gunNum} ${ay} ${yil}`;
        }
        // ISO veya diğer formatlar
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        const gun = d.getDate();
        const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const ay = aylar[d.getMonth()];
        const yil = d.getFullYear();
        return `${gun} ${ay} ${yil}`;
    }
    function durumBadge(docStatus) {
        if (docStatus === 1 || docStatus === '1') return '<span class="badge bg-warning text-dark">Beklemede</span>';
        if (docStatus === 2 || docStatus === '2') return '<span class="badge bg-success">Tamamlandı</span>';
        if (docStatus === 3 || docStatus === '3') return '<span class="badge bg-danger">İptal Edildi</span>';
        return '-';
    }
    function showLoading() {
        $('.loading-screen').css('display', 'flex');
    }
    function hideLoading() {
        $('.loading-screen').hide();
    }

    // Initialize DataTable safely
    function initDataTable() {
        // Use SafeDT if available, otherwise fall back to standard initialization
        if (window.SafeDT && typeof window.SafeDT.init === 'function') {
            dataTable = window.SafeDT.init('#inventoryTable', {
                responsive: true,
                ordering: true,
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
                },
                columnDefs: [
                    { responsivePriority: 1, targets: 0 },
                    { responsivePriority: 2, targets: 1 },
                    { responsivePriority: 3, targets: 2 }
                ]
            });
        } else {
            // Standard initialization if SafeDT is not available
            if ($.fn.dataTable.isDataTable('#inventoryTable')) {
                dataTable = $('#inventoryTable').DataTable();
            } else {
                dataTable = $('#inventoryTable').DataTable({
                    responsive: true,
                    ordering: true,
                    language: {
                        url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/tr.json'
                    },
                    columnDefs: [
                        { responsivePriority: 1, targets: 0 },
                        { responsivePriority: 2, targets: 1 },
                        { responsivePriority: 3, targets: 2 }
                    ]
                });
            }
        }

        // Apply dark mode if needed
        if (document.body.classList.contains('dark-mode')) {
            if (window.applyDarkModeToDataTables) {
                window.applyDarkModeToDataTables();
            }
        }

        return dataTable;
    }

    showLoading();
    $.ajax({
        url: `/api/count-detail/${docNum}`,
        method: 'GET',
        data: {
            sessionId: sessionId
        },
        success: function (res) {
            hideLoading();
            let data = res.value || res.data || res;
            if (!Array.isArray(data) || data.length === 0) {
                $('#headerDocNum').text(docNum);
                $('#docNum').text(docNum);
                $('#docDate').text('-');
                $('#whsCode').text('-');
                $('#docStatus').html('-');
                $('#comments').text('-');
                $('#itemsTableBody').html('<tr><td colspan="5">Kayıt bulunamadı.</td></tr>');
                return;
            }
            // Üst bilgiler (ilk satırdan)
            const first = data[0];
            $('#headerDocNum').text(first.DocNum || docNum);
            $('#docNum').text(first.DocNum || '');
            $('#docDate').text(formatDate(first.RefDate));
            $('#whsCode').text(first.WhsCode || '');
            $('#docStatus').html(durumBadge(first.DocStatus));
            $('#comments').text(first.Comments || '-');
            // Kalemler
            let rows = data.map(row => `
                <tr>
                    <td>${row.ItemCode || ''}</td>
                    <td>${row.ItemName || ''}</td>
                    <td>${row.Quantity != null ? row.Quantity : ''}</td>
                    <td>${row.UomCode || ''}</td>
                    <td>${row.ItemGroup || ''}</td>
                </tr>
            `).join('');
            $('#itemsTableBody').html(rows);
            
            // Initialize DataTable
            initDataTable();
        },
        error: function () {
            hideLoading();
            $('#headerDocNum').text(docNum);
            $('#docNum').text(docNum);
            $('#docDate').text('-');
            $('#whsCode').text('-');
            $('#docStatus').html('-');
            $('#comments').text('-');
            $('#itemsTableBody').html('<tr><td colspan="5">Veri alınamadı.</td></tr>');
        }
    });

    // Listen for dark mode changes to update DataTable
    document.addEventListener('darkModeChanged', function(e) {
        if (e.detail && typeof e.detail.isDarkMode === 'boolean') {
            const isDarkMode = e.detail.isDarkMode;
            if (dataTable) {
                dataTable.draw();
            }
        }
    });
});
