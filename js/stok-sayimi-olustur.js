// js/stok-sayimi-olustur.js
// Stok sayımı oluşturma sayfası: üst bilgiler ve ürünler otomatik doldurulur, miktarlar girilip topluca gönderilir

$(document).ready(function () {
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

    const sessionId = localStorage.getItem('sessionId');
    const whsCode = localStorage.getItem('whsCode') || localStorage.getItem('branchCode') || '';
    const user = localStorage.getItem('userCode') || localStorage.getItem('username') || '';
    $('#U_WhsCode').val(whsCode);
    $('#U_User').val(user); 
    $('#U_RefDate').val(new Date().toISOString().slice(0,10));
    let urunler = [];

    function fillUrunlerTable(data) {
        urunler = data;
        let html = '';
        data.forEach((item, idx) => {
            html += `<tr>
                <td><input type="text" class="form-control" name="ItemCode" value="${item.ItemCode}" readonly></td>
                <td><input type="text" class="form-control" name="ItemName" value="${item.ItemName}" readonly></td>
                <td><input type="text" class="form-control" name="ItemGroup" value="${item.ItemGroup || ''}" readonly></td>
                <td><input type="number" class="form-control" name="Quantity" value="" step="0.01" data-idx="${idx}" required></td>
                <td><input type="text" class="form-control" name="UomCode" value="${item.UomCode}" readonly></td>
            </tr>`;
        });
        $('#urunlerTableBody').html(html);
    }

    showLoading('Ürünler yükleniyor...');
    $.ajax({
        url: '/api/count-new-list', // Bu endpoint stok sayımı için kullanılabilir ürünleri dönecek
        method: 'GET',
        data: { sessionId: sessionId, whsCode: whsCode },
        success: function (res) {
            hideLoading();
            let data = res.value || res.data || res;
            if (!Array.isArray(data) || data.length === 0) {
                $('#urunlerTableBody').html('<tr><td colspan="5">Listelenecek kalem yok.</td></tr>');
                return;
            }
            fillUrunlerTable(data);
            
            // Tablo yüklendikten sonra toplam ürün sayısını göster
            const itemCount = data.length;
            $('#itemCountInfo').text(`Toplam ${itemCount} ürün listelendi`);
        },
        error: function (xhr, status, error) {
            hideLoading();
            
            // Oturum hatası kontrolü
            if (handleSessionError(xhr)) return;
            
            console.error('Ürünler alınamadı:', error);
            $('#urunlerTableBody').html(`<tr><td colspan="5">Ürünler alınamadı! Hata: ${error}</td></tr>`);
        }
    });

    $('#stok-sayimi-olustur-form').on('submit', function (e) {
        e.preventDefault();
        showLoading('Sayımlar hazırlanıyor...');
        
        // Tabloyu gezip miktarları oku
        let sayimlar = [];
        const batchGuid = generateUUID(); // Tüm sayımlar için ortak bir GUID ön eki
        
        $('#urunlerTableBody tr').each(function (i, tr) {
            const miktar = $(tr).find('input[name="Quantity"]').val();
            if (miktar && parseFloat(miktar) > 0) {
                const itemCode = urunler[i].ItemCode;
                sayimlar.push({
                    U_WhsCode: whsCode,
                    U_RefDate: $('#U_RefDate').val(),
                    U_ItemCode: itemCode,
                    U_ItemName: urunler[i].ItemName,
                    U_ItemGroup: urunler[i].ItemGroup || '',
                    U_Quantity: parseFloat(miktar),
                    U_UomCode: urunler[i].UomCode,
                    U_GUID: `${batchGuid}_${itemCode}`,
                    U_SessionID: sessionId,
                    U_User: user
                });
            }
        });
        
        /* Miktar girilme zorunluluğu kaldırıldı
        if (sayimlar.length === 0) {
            hideLoading();
            Swal.fire({
                icon: 'warning',
                title: 'Uyarı',
                text: 'En az bir kalem için miktar giriniz!',
                confirmButtonText: 'Tamam'
            });
            return;
        }
        */
        
        // Sayım verilerini göster
        showLoading(`${sayimlar.length} ürün için sayım gönderiliyor...`);
        console.log(`Toplam ${sayimlar.length} ürün sayımı gönderiliyor:`, sayimlar);
        
        // Tümünü topluca gönder
        $.ajax({
            url: '/api/count', // Standartlaştırılmış endpoint
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(sayimlar),
            success: function (result) {
                hideLoading();
                
                console.log('Sayım sonucu:', result);
                
                if (!result.success) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Hata',
                        text: 'Sayım başarısız: ' + (result.error || 'Bilinmeyen hata'),
                        confirmButtonText: 'Tamam'
                    });
                    return;
                }
                
                // Başarı ve hata istatistikleri
                const successCount = result.successCount || 0;
                const failCount = result.failCount || 0;
                
                // Başarı veya kısmi başarı mesajı göster
                if (failCount === 0) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Başarılı',
                        text: `${successCount} ürün sayımı başarıyla kaydedildi!`,
                        confirmButtonText: 'Tamam'
                    }).then(() => {
                        window.location.href = 'stok-sayimlarim.html';
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Kısmi Başarı',
                        html: `${successCount} ürün kaydedildi<br>${failCount} ürün kaydedilemedi<br>Detaylar için konsolu kontrol edin.`,
                        confirmButtonText: 'Tamam'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = 'stok-sayimlarim.html';
                        }
                    });
                }
            },
            error: function (xhr, status, error) {
                hideLoading();
                
                // Oturum hatası kontrolü
                if (handleSessionError(xhr)) return;
                
                console.error('Stok sayımı oluşturma hatası:', error, xhr.responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Hata',
                    text: `Stok sayımı oluşturulurken hata oluştu: ${error}`,
                    confirmButtonText: 'Tamam'
                });
            }
        });
    });
});
