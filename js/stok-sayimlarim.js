// js/stok-sayimlarim.js
// Stok sayım listesi ekranı için veri çekme ve tabloya yazma

$(document).ready(function () {
    const sessionId = localStorage.getItem('sessionId');
    const whsCode = localStorage.getItem("branchCode");
    let countTable;
    // Sayfa yenileme kontrolü için localStorage değişkeni
    const shouldRefresh = localStorage.getItem('refreshCountList');
    
    // Sayfa açıldığında yenileme bayrağı varsa temizle
    if (shouldRefresh) {
        localStorage.removeItem('refreshCountList');
    }

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

    // ISO tarih formatına çevirme (2022-01-01 formatı)
    function formatDateForFilter(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return '';
        return d.toISOString().split('T')[0]; // YYYY-MM-DD formatı
    }

    function durumBadge(docStatus) {
        // DocStatus: 1:Beklemede (Sarı), 2:Tamamlandı (Yeşil), 3:İptal Edildi (Kırmızı)
        if (docStatus === 1 || docStatus === '1') return '<span class="badge bg-warning text-dark">Beklemede</span>';
        if (docStatus === 2 || docStatus === '2') return '<span class="badge bg-success">Tamamlandı</span>';
        if (docStatus === 3 || docStatus === '3') return '<span class="badge bg-danger">İptal Edildi</span>';
        return '-';
    }

    function islemBtn(docNum, docStatus, data) {
        // İşlem butonlarını grup içinde oluştur (üretim-siparisleri.html sayfasındaki gibi)
        let buttons = `<div class="btn-group">`;
        
        // Detay butonu - tüm durumlar için göster
        buttons += `<a href="stok-sayimi-detay.html?docNum=${docNum}" class="btn btn-sm btn-primary">
            <i class="bi bi-eye"></i> Detay
        </a>`;
        
        // Beklemede olan sayımlar için düzenleme butonu ekle
        if (docStatus === 1 || docStatus === '1') {
            buttons += `<a href="stok-sayimi-duzenle.html?docNum=${docNum}" class="btn btn-sm btn-success">
                <i class="bi bi-pencil"></i> Düzenle
            </a>`;
        }
        
        buttons += `</div>`;
        return buttons;
    }

    function showLoading() {
        $('.loading-screen').css('display', 'flex');
    }
    function hideLoading() {
        $('.loading-screen').hide();
    }

    // DataTable'ı başlat
    function initDataTable() {
        // Önceki instance varsa yok et
        if (countTable) {
            countTable.destroy();
        }
        
        showLoading();
        
        console.log('Initializing table with sessionId:', sessionId, 'whsCode:', whsCode);
        
        // DataTable'ı AJAX destekli olarak yeniden oluştur
        countTable = $('#sayimListesiTable').DataTable({
            responsive: true,
            destroy: true,
            language: {
                url: 'i18n/tr.json'
            },
            autoWidth: true,
            processing: true,
            serverSide: false, // Tüm veriyi tek seferde çek
            ajax: {
                url: '/api/count-list',
                type: 'GET',
                data: function(d) {
                    d.sessionId = sessionId;
                    d.whsCode = whsCode;
                    return d;
                },
                dataSrc: function(json) {
                    hideLoading();
                    console.log('API response:', json);
                    
                    // API'den gelen veriyi DataTable'a uygun formata dönüştür
                    // Farklı API yanıt formatlarını destekle
                    let data = [];
                    
                    // JSON yapısının farklı formatlarını kontrol et
                    if (json.value && Array.isArray(json.value)) {
                        data = json.value;
                    } else if (json.data && Array.isArray(json.data)) {
                        data = json.data;
                    } else if (Array.isArray(json)) {
                        data = json;
                    } else {
                        console.warn('Unexpected API response format:', json);
                        return [];
                    }
                    
                    console.log('Processed data:', data);
                    
                    // Veri yoksa boş dizi döndür
                    if (!Array.isArray(data) || data.length === 0) {
                        console.log('No data available');
                        return [];
                    }
                    
                    try {
                        // Her bir veri satırını işle ve yeni formatta dizi döndür
                        return data.map(function(item) {
                            return [
                                item.WhsCode || '',
                                item.DocNum || '',
                                formatDate(item.RefDate || ''),
                                formatDate(item.DocDate || ''),
                                durumBadge(item.DocStatus),
                                islemBtn(item.DocNum, item.DocStatus, item),
                                item.DocStatus  // Gizli sütun - filtreleme için
                            ];
                        });
                    } catch (error) {
                        console.error('Error processing data:', error);
                        return [];
                    }
                },
                cache: false,
                error: function(xhr, error, thrown) {
                    console.error('AJAX error:', xhr, error, thrown);
                    hideLoading();
                    $('#sayimListesiTable tbody').html('<tr><td colspan="6">Veri alınamadı.</td></tr>');
                }
            },
            columnDefs: [
                { width: '12%', targets: 0 },  // Şube
                { width: '10%', targets: 1 },  // Sayım No
                { width: '15%', targets: 2 },  // Başlangıç Tarihi
                { width: '15%', targets: 3 },  // Giriş Tarihi
                { width: '13%', targets: 4 },  // Durum
                { width: '35%', targets: 5 },  // İşlemler
                { 
                    // Gizli sütun - filtreleme için DocStatus değerini sakla
                    targets: 6,
                    visible: false,
                    searchable: true
                }
            ],
            stateSave: false,
            deferRender: false,
            order: [[1, 'desc']], // Sayım No'ya göre büyükten küçüğe sırala
            createdRow: function(row, data, dataIndex) {
                // Satıra durum kodu ekle
                $(row).attr('data-status', data[6]);
            },
            initComplete: function() {
                // DataTable oluşturulduktan sonra genişliği ayarla
                $(window).trigger('resize');
                
                // Filtreleri uygula
                setTimeout(function() {
                    applyFilters();
                }, 100);
                
                console.log('DataTable initialization complete');
            },
            drawCallback: function() {
                console.log('DataTable draw complete');
            }
        });
    }

    // Sayfa yüklendiğinde veya resize olduğunda DataTable genişliğini ayarla
    $(window).on('resize', function() {
        if (countTable) {
            countTable.columns.adjust().responsive.recalc();
        }
    });

    // Sidebar toggle olayını izle
    document.querySelector('.main-content').addEventListener('transitionend', function(e) {
        if (e.propertyName === 'margin-left' || e.propertyName === 'width') {
            if (countTable) {
                countTable.columns.adjust().responsive.recalc();
            }
        }
    });
    
    // Filtreleri uygulama
    function applyFilters() {
        if (!countTable) return;
        
        const statusFilter = $('#statusFilter').val();
        const startDate = $('#dateFromFilter').val();
        const endDate = $('#dateToFilter').val();
        
        // Özel filtreyi temizleme
        $.fn.dataTable.ext.search.pop();
        
        // Özel filtreleme fonksiyonu
        $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
            if (settings.nTable.id !== 'sayimListesiTable') return true;
            
            let passStatusFilter = true;
            let passDateFilter = true;
            
            // Durum filtresi
            if (statusFilter && statusFilter !== '') {
                const rowStatus = data[6]; // Gizli sütundaki durum değeri
                passStatusFilter = rowStatus === statusFilter;
            }
            
            // Tarih filtresi
            if (startDate || endDate) {
                // Giriş tarihi sütunu (4. sütun, index: 3)
                const dateText = data[3]; 
                
                // Tarih formatlama (örn. "15 Ocak 2023" -> Date objesi)
                const dateParts = dateText.split(' ');
                if (dateParts.length >= 3) {
                    const day = parseInt(dateParts[0], 10);
                    const monthNames = [
                        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
                    ];
                    const month = monthNames.indexOf(dateParts[1]);
                    const year = parseInt(dateParts[2], 10);
                    
                    if (!isNaN(day) && month !== -1 && !isNaN(year)) {
                        const rowDate = new Date(year, month, day);
                        
                        // Başlangıç tarihi kontrolü
                        if (startDate && startDate !== '') {
                            const startDateObj = new Date(startDate);
                            // Saat kısmını sıfırla
                            startDateObj.setHours(0, 0, 0, 0);
                            if (rowDate < startDateObj) {
                                passDateFilter = false;
                            }
                        }
                        
                        // Bitiş tarihi kontrolü
                        if (endDate && endDate !== '') {
                            const endDateObj = new Date(endDate);
                            // Bitiş tarihini günün sonuna ayarla
                            endDateObj.setHours(23, 59, 59, 999);
                            if (rowDate > endDateObj) {
                                passDateFilter = false;
                            }
                        }
                    }
                }
            }
            
            return passStatusFilter && passDateFilter;
        });
        
        countTable.draw();
    }
    
    // Filtre olayları
    $('#statusFilter, #dateFromFilter, #dateToFilter').on('change', function() {
        applyFilters();
    });

    // Yenileme butonu ekle
    $('#refreshBtn').on('click', function(e) {
        e.preventDefault();
        showLoading();
        if (countTable) {
            countTable.ajax.reload(function() {
                hideLoading();
                console.log('Data reloaded successfully');
            }, false);
        } else {
            hideLoading();
        }
    });

    // DataTable'ı başlat - artık veri AJAX ile yüklenecek
    initDataTable();
    
    // Stil ekleme - satır renklerini durum koduna göre hafifçe değiştir
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            tr[data-status="1"] { background-color: rgba(255, 193, 7, 0.05); }
            tr[data-status="2"] { background-color: rgba(25, 135, 84, 0.05); }
            tr[data-status="3"] { background-color: rgba(220, 53, 69, 0.05); }
        `)
        .appendTo('head');
});
