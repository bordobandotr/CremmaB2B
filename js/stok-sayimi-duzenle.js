// js/stok-sayimi-duzenle.js
// Stok sayımı düzenleme sayfası: mevcut sayımlar görüntülenir ve düzenlenebilir

$(document).ready(function () {
    // Utility functions
    function showLoading(msg) { 
        $('.loading-screen').css('display', 'flex'); 
        if (msg) $('.loading-text').text(msg); 
    }
    
    function hideLoading() { 
        $('.loading-screen').hide(); 
    }
    
    function generateUUID() { 
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { 
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); 
            return v.toString(16); 
        }); 
    }

    // Oturum hatası kontrolü
    function handleSessionError(xhr) {
        if (xhr.status === 401) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.sessionExpired) {
                    console.error('Oturum süresi doldu, yeniden giriş yapılıyor...');
                    localStorage.removeItem('sessionId');
                    Swal.fire({
                        icon: 'error',
                        title: 'Oturum Süresi Doldu',
                        text: 'Oturum süreniz doldu. Yeniden giriş yapmanız gerekiyor.',
                        confirmButtonText: 'Giriş Yap'
                    }).then(() => {
                        window.location.href = '/login.html';
                    });
                    return true;
                }
            } catch (e) {
                console.error('Oturum hatası işlenirken hata:', e);
            }
        }
        return false;
    }

    // Progress Bar Güncellemesi
    function updateProgressBar(percent) {
        $('.progress-bar').css('width', percent + '%').attr('aria-valuenow', percent);
    }

    // Güvenli fetch fonksiyonu - oturum hatalarını yakalar
    async function fetchWithSessionCheck(url, options) {
        try {
            const response = await fetch(url, options);
            
            // HTTP 401 kontrolü - oturum süresi dolmuş
            if (response.status === 401) {
                const responseJson = await response.json();
                
                if (responseJson.sessionExpired) {
                    console.error('Oturum süresi doldu, yeniden giriş yapılıyor...');
                    localStorage.removeItem('sessionId');
                    Swal.fire({
                        icon: 'error',
                        title: 'Oturum Süresi Doldu',
                        text: 'Oturum süreniz doldu. Yeniden giriş yapmanız gerekiyor.',
                        confirmButtonText: 'Giriş Yap'
                    }).then(() => {
                        window.location.href = '/login.html';
                    });
                    throw new Error('Oturum süresi doldu');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    // RetryAjax - istek hatası durumunda yeniden deneme mekanizması
    function retryAjax(options, maxRetries = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            let retriesLeft = maxRetries;
            
            function attemptRequest() {
                $.ajax(options)
                    .done(data => resolve(data))
                    .fail(error => {
                        if (handleSessionError(error)) {
                            reject(error);
                            return;
                        }
                        
                        retriesLeft--;
                        console.log(`AJAX isteği başarısız. Kalan deneme: ${retriesLeft}`);
                        
                        if (retriesLeft > 0) {
                            setTimeout(attemptRequest, delay);
                        } else {
                            reject(error);
                        }
                    });
            }
            
            attemptRequest();
        });
    }

    // Sayfa yükleme işlemleri
    const urlParams = new URLSearchParams(window.location.search);
    const docNum = urlParams.get('docNum');
    const sessionId = localStorage.getItem('sessionId');
    const userName = localStorage.getItem('userName') || '-';
    const whsCode = localStorage.getItem('branchCode');

    if (!sessionId || !whsCode || !docNum) {
        Swal.fire({
            icon: 'error',
            title: 'Hata',
            text: 'Oturum bilgisi veya sayım numarası eksik!',
            confirmButtonText: 'Tamam'
        }).then(() => {
            window.location.href = 'stok-sayimlarim.html';
        });
        return;
    }

    // Değişiklikleri takip etmek için
    let originalItems = []; // Orijinal değerleri tutacak
    let changedItemsMap = new Map(); // Değişen ürünleri tutacak

    // Değişiklikleri güncelle ve göster
    function updateChangedItemCount() {
        const count = changedItemsMap.size;
        const $counter = $('#changedItemCounter');
        
        if (count > 0) {
            $counter.text(count).show();
            $('#showChangedItemsBtn').removeClass('btn-outline-primary').addClass('btn-primary');
        } else {
            $counter.hide();
            $('#showChangedItemsBtn').removeClass('btn-primary').addClass('btn-outline-primary');
        }
    }

    // Deep copy işlevi
    function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Tarih formatını düzenle (YYYY-MM-DD)
    function formatDateForInput(dateStr) {
        try {
            if (!dateStr) return new Date().toISOString().split('T')[0];
            
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return new Date().toISOString().split('T')[0]; // Geçersizse bugünü döndür
            }
            return date.toISOString().split('T')[0];
        } catch (e) {
            console.error("Tarih dönüştürme hatası:", e);
            return new Date().toISOString().split('T')[0]; // Hata durumunda bugünü döndür
        }
    }
    
    // Durum değerine göre stil uygula
    function applyStatusStyle(status) {
        const select = $('#docStatusSelect');
        if (!select.length) return;
        
        // Önceki stilleri temizle
        select.removeClass('status-pending status-completed status-cancelled');
        
        // Yeni stil uygula
        switch(status) {
            case '1':
                select.addClass('status-pending');
                break;
            case '2':
                select.addClass('status-completed');
                break;
            case '3':
                select.addClass('status-cancelled');
                break;
        }
    }

    // Sayım detayını yükle
    async function loadCountDetails() {
        showLoading('Sayım detayları yükleniyor...');
        updateProgressBar(10);
        
        try {
            const response = await fetchWithSessionCheck(`/api/count-edit/${docNum}?sessionId=${sessionId}`);
            const data = await response.json();
            
            if (!Array.isArray(data) || data.length === 0) {
                hideLoading();
                Swal.fire({
                    icon: 'warning',
                    title: 'Uyarı',
                    text: 'Sayım detayı bulunamadı!',
                    confirmButtonText: 'Tamam'
                }).then(() => {
                    window.location.href = 'stok-sayimlarim.html';
                });
                return;
            }
            
            // Orijinal değerleri sakla
            originalItems = deepCopy(data);
            updateProgressBar(30);
            
            // Sayfayı oluştur
            buildPage(data);
            updateProgressBar(100);
            
            // Yükleniyor ekranını kapat
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error('Sayım detayı alınamadı:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: 'Sayım detayı alınamadı: ' + error.message,
                confirmButtonText: 'Tamam'
            }).then(() => {
                window.location.href = 'stok-sayimlarim.html';
            });
        }
    }

    // Sayfayı oluştur
    function buildPage(data) {
        const firstItem = data[0]; // İlk ürün, genel bilgiler için kullanılacak
        
        let html = '';
        html += `<div class='card mb-3'><div class='card-body'>`;
        html += `<div class='row mb-2'>
            <div class='col-md-3'><b>Şube Kodu:</b> <span>${firstItem.WhsCode || whsCode}</span></div>
            <div class='col-md-3'><b>Sayım No:</b> <span>${firstItem.DocNum || docNum}</span></div>
            <div class='col-md-2'><b>Kullanıcı:</b> <span>${userName}</span></div>
            <div class='col-md-2'>
                <label for='docStatusSelect'><b>Durum:</b></label>
                <select id='docStatusSelect' class='form-select form-select-sm'>
                    <option value='1' ${firstItem.DocStatus === '1' ? 'selected' : ''}>Beklemede</option>
                    <option value='2' ${firstItem.DocStatus === '2' ? 'selected' : ''}>Tamamlandı</option>
                    <option value='3' ${firstItem.DocStatus === '3' ? 'selected' : ''}>İptal Edildi</option>
                </select>
            </div>
            <div class='col-md-2'><label for='countDateInput'><b>Sayım Tarihi:</b></label> <input type='date' id='countDateInput' class='form-control form-control-sm' value='${formatDateForInput(firstItem.RefDate || new Date().toISOString())}'></div>
        </div>`;
        
        html += `</div></div>`;
        
        // Değişiklik kontrol butonları
        html += `<div class="d-flex justify-content-between align-items-center mb-3">
            <div id="itemCountInfo" class="text-muted small">
                Toplam ${data.length} ürün listelendi
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="resetChangesBtn">
                    <i class="bi bi-arrow-counterclockwise"></i> Değişiklikleri Sıfırla
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary position-relative" id="showChangedItemsBtn">
                    <i class="bi bi-eye"></i> Değişenleri Göster
                    <span id="changedItemCounter" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display:none;">0</span>
                </button>
            </div>
        </div>`;
        
        html += `<div class='card'><div class='card-body'>`;
        html += `<table id="countTable" class="table table-bordered table-hover"><thead><tr>
            <th>Kalem Kodu</th><th>Kalem Tanımı</th><th>Kalem Grubu</th><th>Ölçü Birimi</th><th>Sayım Miktarı</th>
        </tr></thead><tbody>`;
        
        data.forEach(item => {
            html += `<tr>
                <td>${item.ItemCode || ''}</td>
                <td>${item.ItemName || ''}</td>
                <td>${item.ItemGroup || ''}</td>
                <td>${item.UomCode || ''}</td>
                <td>
                    <div class="input-group quantity-control">
                        <button type="button" class="btn btn-outline-secondary btn-sm decrease-qty" data-item-code="${item.ItemCode}">-</button>
                        <input type="number" class="form-control form-control-sm count-input" data-item-code="${item.ItemCode}" data-original-quantity="${item.Quantity || 0}" min="0" value="${item.Quantity || 0}" style="width:60px;text-align:center;">
                        <button type="button" class="btn btn-outline-secondary btn-sm increase-qty" data-item-code="${item.ItemCode}">+</button>
                    </div>
                </td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        html += `<div class='text-end mt-3'><button class='btn btn-primary' id='showPreviewBtn'>Önizle ve Güncelle</button></div>`;
        html += `</div></div>`;
        
        document.getElementById('dynamic-content').innerHTML = html;
        
        // Durum seçimine göre stil uygulaması ve event listener ekle
        const docStatusSelect = document.getElementById('docStatusSelect');
        applyStatusStyle(docStatusSelect.value || '1');
        
        // Durum değişimi izleme
        docStatusSelect.addEventListener('change', function() {
            applyStatusStyle(this.value);
        });
        
        // DataTable başlat
        setTimeout(() => {
            if (window.$ && $.fn.DataTable) {
                window.countTable = $('#countTable').DataTable({
                    responsive: true,
                    pageLength: 25,
                    lengthMenu: [[25, 50, 100], [25, 50, 100]],
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
                    order: [[0, 'asc']],
                    columnDefs: [{
                        targets: -1,
                        orderable: false
                    }],
                    processing: true,
                    orderCellsTop: true,
                    orderMulti: true,
                    ordering: true
                });
            }
        }, 200);
        
        // Buton event handlers - event delegation kullanarak sayfalar arası çalışmasını sağla
        
        // + ve - butonları için event handlers
        $(document).on('click', '.decrease-qty', function() {
            const input = $(this).closest('.quantity-control').find('.count-input')[0];
            let val = parseFloat(input.value) || 0;
            if (val > 0) {
                input.value = (val - 1).toFixed(2);
                $(input).trigger('change');
            }
        });
        
        $(document).on('click', '.increase-qty', function() {
            const input = $(this).closest('.quantity-control').find('.count-input')[0];
            let val = parseFloat(input.value) || 0;
            input.value = (val + 1).toFixed(2);
            $(input).trigger('change');
        });
        
        // Miktar değişikliklerini izle
        $(document).on('change', '.count-input', function() {
            const input = this;
            const itemCode = input.getAttribute('data-item-code');
            const originalQty = parseFloat(input.getAttribute('data-original-quantity')) || 0;
            const newQty = parseFloat(input.value) || 0;
            
            if (newQty !== originalQty) {
                // Değişiklik var, arka plan rengini değiştir
                $(input).closest('tr').addClass('row-changed');
                
                // Değişen ürünleri sakla
                const item = originalItems.find(i => i.ItemCode === itemCode);
                if (item) {
                    changedItemsMap.set(itemCode, {
                        itemCode: itemCode,
                        originalQuantity: originalQty,
                        newQuantity: newQty,
                        itemName: item.ItemName,
                        uomCode: item.UomCode
                    });
                }
            } else {
                // Değişiklik yok, normal arka plana dön
                $(input).closest('tr').removeClass('row-changed');
                
                // Değişikliği map'ten kaldır
                if (changedItemsMap.has(itemCode)) {
                    changedItemsMap.delete(itemCode);
                }
            }
            
            // Değişiklik sayacını güncelle
            updateChangedItemCount();
        });
        
        // Önizle ve Güncelle butonu
        $(document).on('click', '#showPreviewBtn', function() {
            showUpdatePreview();
        });
        
        // Değişiklikleri Sıfırla butonu
        $(document).on('click', '#resetChangesBtn', function() {
            Swal.fire({
                title: 'Değişiklikleri Sıfırla',
                text: 'Tüm değişiklikler sıfırlanacak. Emin misiniz?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Evet, Sıfırla',
                cancelButtonText: 'İptal'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Tüm değişiklikleri sıfırla
                    document.querySelectorAll('.count-input').forEach(input => {
                        const itemCode = input.getAttribute('data-item-code');
                        const originalQty = parseFloat(input.getAttribute('data-original-quantity')) || 0;
                        input.value = originalQty.toFixed(2);
                        input.closest('tr').classList.remove('row-changed');
                    });
                    
                    // Değişiklik haritasını temizle
                    changedItemsMap.clear();
                    updateChangedItemCount();
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Sıfırlandı',
                        text: 'Tüm değişiklikler orijinal değerlere döndürüldü',
                        confirmButtonText: 'Tamam'
                    });
                }
            });
        });
        
        // Değişenleri Göster butonu
        $(document).on('click', '#showChangedItemsBtn', function() {
            if (changedItemsMap.size === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Bilgi',
                    text: 'Henüz değişiklik yapılmadı.',
                    confirmButtonText: 'Tamam'
                });
                return;
            }
            
            // Değişen ürünleri içeren regex oluştur
            const itemCodes = Array.from(changedItemsMap.keys()).join('|');
            
            if ($(this).find('i').hasClass('bi-eye')) {
                // Sadece değişenleri göster
                window.countTable.search(itemCodes, true, false).draw();
                $(this).find('i').removeClass('bi-eye').addClass('bi-eye-slash');
                $(this).find('span:not(#changedItemCounter)').text(' Tümünü Göster');
            } else {
                // Tümünü göster
                window.countTable.search('').draw();
                $(this).find('i').removeClass('bi-eye-slash').addClass('bi-eye');
                $(this).find('span:not(#changedItemCounter)').text(' Değişenleri Göster');
            }
        });
    }

    // Önizleme modalı göster
    function showUpdatePreview() {
        // Değişen ürünleri kontrol et
        const hasChanges = changedItemsMap.size > 0;
        const docStatus = $('#docStatusSelect').val();
        let statusText = "Beklemede";
        let statusClass = "status-pending";
        
        if (docStatus === '2') {
            statusText = "Tamamlandı";
            statusClass = "status-completed";
        } else if (docStatus === '3') {
            statusText = "İptal Edildi";
            statusClass = "status-cancelled";
        }
        
        let modalHtml = '';
        
        // Durum bilgisi göster
        modalHtml += `<div class="mb-3">
            <strong>Durum:</strong> <span class="${statusClass}">${statusText}</span>
        </div>`;
        
        if (hasChanges) {
            modalHtml += `<div class="alert alert-info mb-3">
                <strong>${changedItemsMap.size}</strong> ürün için değişiklik yapıldı
            </div>`;
            
            // Değişen ürünleri modalda göster
            changedItemsMap.forEach(item => {
                modalHtml += `
                <div class="item-row">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold">${item.itemName}</div>
                            <div class="text-muted small">${item.itemCode}</div>
                        </div>
                        <div class="quantity-badge">
                            <div class="quantity-controls">
                                <button type="button" class="decrease-modal-qty" data-item-code="${item.itemCode}">−</button>
                                <span class="quantity-value">${item.newQuantity}</span>
                                <button type="button" class="increase-modal-qty" data-item-code="${item.itemCode}">+</button>
                            </div>
                            <span class="ms-2">${item.uomCode}</span>
                            <div class="original-value small text-muted">Önceki: ${item.originalQuantity}</div>
                        </div>
                    </div>
                </div>`;
            });
        } else {
            modalHtml += `<div class="alert alert-warning mb-3">
                Hiçbir üründe değişiklik yapılmadı. Yine de güncellemek istiyor musunuz?
            </div>`;
            
            // Birkaç örnek ürün göster
            const sampleItems = originalItems.slice(0, Math.min(5, originalItems.length));
            sampleItems.forEach(item => {
                modalHtml += `
                <div class="item-row">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold">${item.ItemName}</div>
                            <div class="text-muted small">${item.ItemCode}</div>
                        </div>
                        <div class="quantity-badge">
                            <span>${item.Quantity}</span>
                            <span class="ms-2">${item.UomCode}</span>
                        </div>
                    </div>
                </div>`;
            });
            
            if (originalItems.length > 5) {
                modalHtml += `<div class="text-center mt-2 small text-muted">
                    ve ${originalItems.length - 5} ürün daha...
                </div>`;
            }
        }
        
        $('#orderSummaryList').html(modalHtml);
        
        // Modal göster
        const modal = new bootstrap.Modal(document.getElementById('orderSummaryModal'));
        modal.show();
        
        // Modal içindeki butonlar için event handler'lar
        $('.decrease-modal-qty, .increase-modal-qty').off('click').on('click', function() {
            const $button = $(this);
            const itemCode = $button.data('item-code');
            const isIncrease = $button.hasClass('increase-modal-qty');
            
            if (changedItemsMap.has(itemCode)) {
                const item = changedItemsMap.get(itemCode);
                let currentQuantity = parseFloat(item.newQuantity) || 0;
                
                // Yeni miktarı hesapla
                currentQuantity = isIncrease ? currentQuantity + 1 : Math.max(0, currentQuantity - 1);
                
                // Değişen ürünler haritasını güncelle
                item.newQuantity = currentQuantity;
                changedItemsMap.set(itemCode, item);
                
                // Modal görünümünü güncelle
                $button.siblings('.quantity-value').text(currentQuantity);
                
                // Tablodaki count-input'u güncelle
                $(`input.count-input[data-item-code="${itemCode}"]`).val(currentQuantity).trigger('change');
            }
        });
    }
    
    // Güncellemeleri sunucuya gönder
    function submitUpdates() {
        showLoading('Güncellemeler hazırlanıyor...', 0);
        updateProgressBar(15);
        
        // Tarihi al
        const refDate = $('#countDateInput').val();
        
        // Durum değerini al
        const docStatus = $('#docStatusSelect').val() || '1';
        
        // Değişen ürünleri tespit et
        const changedItems = [];
        const hasChanges = changedItemsMap.size > 0;
        
        if (hasChanges) {
            // Sadece değişen ürünleri gönder
            changedItemsMap.forEach(item => {
                changedItems.push({
                    ItemCode: item.itemCode,
                    ItemName: item.itemName,
                    Quantity: item.newQuantity,
                    UomCode: item.uomCode
                });
            });
        } else {
            // Değişiklik yoksa tüm ürünleri gönder
            originalItems.forEach(item => {
                changedItems.push({
                    ItemCode: item.ItemCode,
                    ItemName: item.ItemName,
                    Quantity: item.Quantity,
                    UomCode: item.UomCode
                });
            });
        }
        
        if (changedItems.length === 0) {
            hideLoading();
            Swal.fire({
                icon: 'warning',
                title: 'Uyarı',
                text: 'Güncellenecek ürün bulunamadı!',
                confirmButtonText: 'Tamam'
            });
            return;
        }
        
        updateProgressBar(30);
        showLoading(`${changedItems.length} ürün için güncelleme hazırlanıyor...`);
        
        // PUT isteği verisini hazırla
        const updateData = {
            DocNum: docNum,
            WhsCode: whsCode,
            DocDate: new Date().toISOString().split('T')[0],
            RefDate: refDate,
            DocStatus: docStatus,
            U_DocStatus: docStatus,
            U_UpdateGUID: generateUUID(),
            U_User: userName,
            AS_B2B_COUNT_DETAILCollection: changedItems
        };
        
        updateProgressBar(50);
        showLoading('Güncelleme gönderiliyor...');
        
        // PUT isteği gönder
        console.log('Güncelleme verisi:', updateData);
        
        // API isteği gönder
        retryAjax({
            url: `/api/count-update`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(updateData),
            headers: {
                'X-Session-Id': sessionId
            }
        }, 3, 1000)
        .then(result => {
            updateProgressBar(100);
            hideLoading();
            
            console.log('Güncelleme sonucu:', result);
            
            if (result.success) {
                // Güncelleme başarılı
                if (hasChanges) {
                    // Tüm değişiklikleri orijinal değer olarak ayarla
                    changedItemsMap.forEach((item, itemCode) => {
                        const originalItem = originalItems.find(i => i.ItemCode === itemCode);
                        if (originalItem) {
                            originalItem.Quantity = item.newQuantity;
                        }
                        
                        // Arka plan rengini sıfırla
                        const row = $(`input.count-input[data-item-code="${itemCode}"]`).closest('tr');
                        row.removeClass('row-changed');
                    });
                    
                    // Değişiklik haritasını temizle
                    changedItemsMap.clear();
                    updateChangedItemCount();
                }
                
                Swal.fire({
                    icon: 'success',
                    title: 'Başarılı',
                    text: 'Stok sayımı başarıyla güncellendi.',
                    confirmButtonText: 'Tamam'
                }).then(() => {
                    window.location.href = 'stok-sayimlarim.html';
                });
            } else {
                // Hata durumu
                Swal.fire({
                    icon: 'error',
                    title: 'Hata',
                    text: result.error || 'Stok sayımı güncellenirken bir hata oluştu.',
                    confirmButtonText: 'Tamam'
                });
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Güncelleme hatası:', error);
            
            let errorMsg = 'Stok sayımı güncellenirken bir hata oluştu.';
            
            if (error.responseJSON && error.responseJSON.error) {
                errorMsg = error.responseJSON.error;
            } else if (error.responseText) {
                try {
                    const errorObj = JSON.parse(error.responseText);
                    errorMsg = errorObj.error || errorObj.message || errorMsg;
                } catch (e) {
                    errorMsg = error.responseText.substring(0, 100);
                }
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Güncelleme Hatası',
                text: errorMsg,
                confirmButtonText: 'Tamam'
            });
        });
    }
    
    // Modal onay butonuna tıklama olayı
    $(document).on('click', '#confirmUpdateBtn', function() {
        // Modalı kapat
        const modal = bootstrap.Modal.getInstance(document.getElementById('orderSummaryModal'));
        if (modal) modal.hide();
        
        // Güncellemeleri gönder
        submitUpdates();
    });
    
    // Sayım detayını yükle
    loadCountDetails();
});
