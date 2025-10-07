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
            // Null, undefined, boş string kontrolü
            if (!dateStr) {
                console.log('formatDateForInput: Empty date value, returning today');
                return new Date().toISOString().split('T')[0];
            }
            
            // SAP'ten gelen tarih formatı bazen 'YYYY-MM-DD' veya 'YYYYMMDD' veya 'DD.MM.YYYY' olabilir
            let date;
            console.log('formatDateForInput raw value:', dateStr);
            
            // SAP'den gelen YYYYMMDD formatını tanıma ve işleme
            if (typeof dateStr === 'string' && dateStr.length === 8 && !dateStr.includes('-') && !dateStr.includes('.')) {
                // YYYYMMDD formatını ele al
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                date = new Date(year, month - 1, day);
                console.log('formatDateForInput: Parsed YYYYMMDD format', dateStr, 'as', year, month, day, date);
            }
            // '.' içeren format - Muhtemelen DD.MM.YYYY
            else if (typeof dateStr === 'string' && dateStr.includes('.')) {
                const parts = dateStr.split('.');
                if (parts.length === 3) {
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                    console.log('formatDateForInput: Parsed DD.MM.YYYY format', date);
                } else {
                    date = new Date(dateStr);
                }
            } 
            // ISO format veya timestamp - doğrudan new Date ile parse et
            else {
                date = new Date(dateStr);
                console.log('formatDateForInput: Parsed standard format', date);
            }
            
            // Geçerli tarih mi kontrol et
            if (isNaN(date.getTime())) {
                console.log('formatDateForInput: Invalid date, returning today');
                return new Date().toISOString().split('T')[0]; // Geçersizse bugünü döndür
            }
            
            // YYYY-MM-DD formatına dönüştür
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            
            const formattedDate = `${yyyy}-${mm}-${dd}`;
            console.log('formatDateForInput: Formatted result', formattedDate);
            return formattedDate;
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
            
            console.log('Sayım detayları yüklendi:', data.length, 'kalem var');
            console.log('İlk kalem örneği:', data[0]);
            
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
        
        console.log('data', data);
        console.log('Building page with data:', data.length, 'items');
        
        // Tüm tarih alanlarını detaylı kontrol et
        console.log('First item date fields:', {
            RefDate: firstItem.RefDate,
            DocDate: firstItem.DocDate,
            CreateDate: firstItem.CreateDate,
            UpdateDate: firstItem.UpdateDate
        });
        
        // Öncelik RefDate > DocDate > Bugün
        // Yeni formatları doğru şekilde ele almak için
        let dateToUse;
        
        if (firstItem.RefDate) {
            // RefDate varsa, formatını kontrol et ve uygun şekilde işle
            dateToUse = firstItem.RefDate;
            console.log('Using RefDate:', dateToUse);
        } 
        else if (firstItem.DocDate) {
            // RefDate yoksa DocDate'i kullan
            dateToUse = firstItem.DocDate;
            console.log('Using DocDate:', dateToUse);
        }
        else {
            // İkisi de yoksa bugünü kullan
            dateToUse = new Date().toISOString().split('T')[0];
            console.log('Using today as default date:', dateToUse);
        }
        
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
            <div class='col-md-2'><label for='countDateInput'><b>Sayım Tarihi:</b></label> <input type='date' id='countDateInput' class='form-control form-control-sm' value='${formatDateForInput(dateToUse)}'></div>
        </div>`;
        
        console.log('Sayım Tarihi (formatlanmış):', formatDateForInput(dateToUse));
        console.log('Formatlanmamış tarih değeri:', dateToUse);
        
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
            const itemCode = item.ItemCode || ''; // ItemCode'u al, yoksa boş string kullan
            
            if (!itemCode) {
                console.warn('Ürün kodu olmayan öğe:', item);
                return; // ItemCode olmayan öğeleri atla
            }
            
            html += `<tr>
                <td>${itemCode}</td>
                <td>${item.ItemName || ''}</td>
                <td>${item.ItemGroup || ''}</td>
                <td>${item.UomCode || ''}</td>
                <td>
                    <div class="input-group quantity-control">
                        <button type="button" class="btn btn-outline-secondary btn-sm decrease-qty" data-item-code="${itemCode}">-</button>
                        <input type="number" class="form-control form-control-sm count-input" data-item-code="${itemCode}" data-original-quantity="${item.Quantity || 0}" min="0" value="${item.Quantity || 0}" style="width:60px;text-align:center;">
                        <button type="button" class="btn btn-outline-secondary btn-sm increase-qty" data-item-code="${itemCode}">+</button>
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
        
        console.log('Sayfa oluşturuldu, event dinleyiciler ayarlanıyor...');
        
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
            if (!itemCode) {
                console.error('Input element does not have data-item-code attribute:', input);
                return;
            }
            
            const originalQty = parseFloat(input.getAttribute('data-original-quantity')) || 0;
            const newQty = parseFloat(input.value) || 0;
            
            console.log(`Change detected - ItemCode: ${itemCode}, Original: ${originalQty}, New: ${newQty}`);
            
            if (newQty !== originalQty) {
                // Değişiklik var, arka plan rengini değiştir
                $(input).closest('tr').addClass('row-changed');
                
                // Değişen ürünleri sakla
                const item = originalItems.find(i => i.ItemCode === itemCode);
                if (item) {
                    console.log(`Adding to changedItemsMap - Key: ${itemCode}, ItemName: ${item.ItemName}, NewQty: ${newQty}`);
                    changedItemsMap.set(itemCode, {
                        itemCode: itemCode,
                        originalQuantity: originalQty,
                        newQuantity: newQty,
                        itemName: item.ItemName,
                        uomCode: item.UomCode
                    });
                } else {
                    console.warn(`Original item not found for itemCode: ${itemCode}`);
                }
            } else {
                // Değişiklik yok, normal arka plana dön
                $(input).closest('tr').removeClass('row-changed');
                
                // Değişikliği map'ten kaldır
                if (changedItemsMap.has(itemCode)) {
                    console.log(`Removing from changedItemsMap - Key: ${itemCode}`);
                    changedItemsMap.delete(itemCode);
                }
            }
            
            // Değişiklik sayacını güncelle
            updateChangedItemCount();
            console.log(`ChangedItemsMap size after update: ${changedItemsMap.size}`);
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
        
        // Güncellenecek olan ürünleri belirle
        const allUpdateItems = [];
        
        originalItems.forEach(item => {
            // Değişen ürün mü kontrol et
            if (changedItemsMap.has(item.ItemCode)) {
                const changedItem = changedItemsMap.get(item.ItemCode);
                if (parseFloat(changedItem.newQuantity) > 0) {
                    allUpdateItems.push({
                        itemCode: item.ItemCode,
                        itemName: item.ItemName,
                        quantity: changedItem.newQuantity,
                        originalQuantity: item.Quantity,
                        uomCode: item.UomCode,
                        isChanged: true
                    });
                }
            } 
            // Değişmeyen ama sıfırdan büyük ürünler
            else if (parseFloat(item.Quantity) > 0) {
                allUpdateItems.push({
                    itemCode: item.ItemCode,
                    itemName: item.ItemName,
                    quantity: item.Quantity,
                    originalQuantity: item.Quantity,
                    uomCode: item.UomCode,
                    isChanged: false
                });
            }
        });
        
        // Modalda bilgi göster
        if (hasChanges) {
            modalHtml += `<div class="alert alert-info mb-3">
                <strong>${changedItemsMap.size}</strong> ürün için değişiklik yapıldı, toplamda <strong>${allUpdateItems.length}</strong> ürün gönderilecek
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
            modalHtml += `<div class="alert alert-info mb-3">
                Hiçbir üründe değişiklik yapılmadı. Güncellemede <strong>${allUpdateItems.length}</strong> ürün gönderilecek.
            </div>`;
            
            // Birkaç örnek ürün göster
            const sampleItems = allUpdateItems.slice(0, Math.min(5, allUpdateItems.length));
            sampleItems.forEach(item => {
                modalHtml += `
                <div class="item-row">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold">${item.itemName}</div>
                            <div class="text-muted small">${item.itemCode}</div>
                        </div>
                        <div class="quantity-badge">
                            <span>${item.quantity}</span>
                            <span class="ms-2">${item.uomCode}</span>
                        </div>
                    </div>
                </div>`;
            });
            
            if (allUpdateItems.length > 5) {
                modalHtml += `<div class="text-center mt-2 small text-muted">
                    ve ${allUpdateItems.length - 5} ürün daha...
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
        
        // Gönderilecek ürünleri saklamak için bir harita (key: ItemCode)
        const itemsToUpdateMap = new Map();
        
        console.log('Original items count:', originalItems.length);
        console.log('Changed items map size:', changedItemsMap.size);
        
        // Map içeriğini göster - debug
        if (changedItemsMap.size > 0) {
            console.log('Changed map entries:');
            changedItemsMap.forEach((value, key) => {
                console.log(`Key: ${key}, Value:`, value);
            });
        }
        
        // ADIM 1: Önce tüm mevcut sıfırdan büyük miktara sahip ürünleri itemsToUpdateMap'e ekle
        originalItems.forEach(item => {
            const itemCode = item.ItemCode || item.itemCode;
            if (!itemCode) {
                console.warn('Ürün kodu olmayan öğe atlıyorum:', item);
                return;
            }
            
            const quantity = parseFloat(item.Quantity);
            if (quantity > 0) {
                itemsToUpdateMap.set(itemCode, {
                    ItemCode: itemCode,
                    ItemName: item.ItemName || item.itemName,
                    Quantity: quantity,
                    UomCode: item.UomCode || item.uomCode
                });
                console.log(`Mevcut ürün eklendi - Kod: ${itemCode}, Miktar: ${quantity}`);
            }
        });
        
        // ADIM 2: Değişen ürünleri haritaya ekle (mevcut değerleri güncelle veya yenilerini ekle)
        changedItemsMap.forEach((changedItem, itemCode) => {
            const newQuantity = parseFloat(changedItem.newQuantity);
            if (newQuantity > 0) {
                // Mevcut üründen UomCode ve ItemName alma
                const originalItem = originalItems.find(i => i.ItemCode === itemCode);
                
                itemsToUpdateMap.set(itemCode, {
                    ItemCode: itemCode,
                    ItemName: originalItem ? (originalItem.ItemName || changedItem.itemName) : changedItem.itemName,
                    Quantity: newQuantity,
                    UomCode: originalItem ? (originalItem.UomCode || changedItem.uomCode) : changedItem.uomCode
                });
                console.log(`Değişen ürün güncellendi - Kod: ${itemCode}, Yeni miktar: ${newQuantity}`);
            } else {
                // Değişen ürünün miktarı 0 ise ve haritada varsa kaldır
                if (itemsToUpdateMap.has(itemCode)) {
                    itemsToUpdateMap.delete(itemCode);
                    console.log(`Miktar 0 olduğu için kaldırıldı - Kod: ${itemCode}`);
                }
            }
        });
        
        // ADIM 3: Haritadan nihai gönderilecek ürün listesini oluştur
        const itemsToUpdate = Array.from(itemsToUpdateMap.values());
        
        console.log(`Toplam güncellenecek ürün sayısı: ${itemsToUpdate.length}`);
        console.log('İlk 5 güncellenecek ürün:', itemsToUpdate.slice(0, 5));
        
        // Hiç güncellenecek ürün yoksa uyarı göster
        if (itemsToUpdate.length === 0) {
            hideLoading();
            Swal.fire({
                icon: 'warning',
                title: 'Uyarı',
                text: 'Güncellenecek ürün bulunamadı! Lütfen en az bir ürün için değer girin.',
                confirmButtonText: 'Tamam'
            });
            return;
        }
        
        // Güncelleme işlemine devam et
        updateProgressBar(30);
        showLoading(`${itemsToUpdate.length} ürün için güncelleme hazırlanıyor...`);
        
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
            AS_B2B_COUNT_DETAILCollection: itemsToUpdate
        };
        
        updateProgressBar(50);
        showLoading('Güncelleme gönderiliyor...');
        
        // PUT isteği gönder
        console.log('Güncelleme verisi:', updateData);
        
        // API isteği gönder
        $.ajax({
            url: `/api/count-update`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(updateData),
            headers: {
                'X-Session-Id': sessionId
            }
        })
        .done(result => {
            updateProgressBar(100);
            hideLoading();
            
            console.log('Güncelleme sonucu:', result);
            
            if (result.success || (typeof result === 'object' && !(result.success === false))) {
                // Güncelleme başarılı
                // Değişen ürünleri güncelle
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
        .fail(error => {
            hideLoading();
            console.error('Güncelleme hatası:', error);
            
            // Oturum hatası kontrolü
            if (handleSessionError(error)) return;
            
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
