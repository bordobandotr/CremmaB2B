# SAP Service Layer Konfigürasyonu

## 🎯 Amaç
SAP Service Layer IP adresini tek bir yerden yönetmek için `SAP_CONFIG` değişkeni oluşturuldu.

## 📍 Konum
`server.js` dosyasının başında (satır 15-27)

## 🔧 Kullanım

### IP Adresini Değiştirmek
Sadece **TEK BİR YERİ** değiştirmeniz yeterli:

```javascript
const SAP_CONFIG = {
    HOST: '10.21.22.11',  // ← SADECE BURASINI DEĞİŞTİRİN!
    PORT: '50000',
    PROTOCOL: 'https',
    ...
}
```

### Örnek Değişiklik
```javascript
// Eski IP'den yeni IP'ye geçiş
const SAP_CONFIG = {
    HOST: '192.168.1.100',  // Yeni IP adresi
    PORT: '50000',
    PROTOCOL: 'https',
}
```

## ✅ Güncellenen Endpoint'ler
Toplam **64 endpoint** otomatik olarak güncellendi:

- ✅ Login endpoint
- ✅ Proxy middleware
- ✅ Ticket endpoints (view, create, update, delete)
- ✅ Production Orders (OWTQ)
- ✅ Supply Orders (OPOR, OPDN)
- ✅ Transfer Orders (OWTR)
- ✅ Checklist endpoints
- ✅ Fire/Zayi (Lost) endpoints
- ✅ Count (Stok Sayım) endpoints
- ✅ Ana Depo endpoints
- ✅ Tüm diğer SAP API çağrıları

## 📝 Teknik Detaylar

### Otomatik URL Oluşturma
```javascript
const SAP_CONFIG = {
    HOST: '10.21.22.11',
    PORT: '50000',
    PROTOCOL: 'https',
    
    // Otomatik oluşturulan URL'ler
    get BASE_URL() {
        return `${this.PROTOCOL}://${this.HOST}:${this.PORT}`;
        // Sonuç: https://10.21.22.11:50000
    },
    get SERVICE_LAYER_URL() {
        return `${this.BASE_URL}/b1s/v1`;
        // Sonuç: https://10.21.22.11:50000/b1s/v1
    }
};
```

### Endpoint'lerde Kullanım
```javascript
// Eski yöntem (❌ Artık kullanılmıyor)
const response = await axiosInstance.post(
    'https://10.21.22.11:50000/b1s/v1/Login',
    data
);

// Yeni yöntem (✅ Şu an kullanılıyor)
const response = await axiosInstance.post(
    `${SAP_CONFIG.SERVICE_LAYER_URL}/Login`,
    data
);
```

## 🚀 Avantajlar

1. **Tek Nokta Yönetimi**: IP değişikliği için sadece 1 satır güncellenir
2. **Hata Azaltma**: Manuel değişiklik hatası riski ortadan kalkar
3. **Bakım Kolaylığı**: Gelecekte IP değişikliği çok hızlı yapılır
4. **Okunabilirlik**: Kod daha temiz ve anlaşılır
5. **Esneklik**: Protocol ve port da kolayca değiştirilebilir

## ⚠️ Önemli Notlar

- Sunucuyu yeniden başlatmayı unutmayın:
  ```bash
  pkill -f "node server.js"
  node server.js
  ```

- `SAP_CONFIG` değişkenini silmeyin veya yeniden adlandırmayın
- Tüm endpoint'ler bu değişkene bağımlıdır

## 📊 İstatistikler

- **Güncellenen Dosya**: `server.js`
- **Toplam Değişiklik**: 64 endpoint
- **Eski IP**: `192.168.54.185` (tamamen kaldırıldı)
- **Yeni IP**: `10.21.22.11` (SAP_CONFIG'de tanımlı)
- **Güncelleme Tarihi**: 2025-10-22

## 🔍 Doğrulama

IP değişikliğinin başarılı olduğunu kontrol etmek için:

```bash
# Hardcoded IP kaldı mı kontrol et (sadece HOST tanımı görünmeli)
grep "10.21.22.11" server.js

# SAP_CONFIG kullanımını kontrol et
grep -c "SAP_CONFIG.SERVICE_LAYER_URL" server.js
# Sonuç: 64 (veya daha fazla)
```

---

**Son Güncelleme**: 22 Ekim 2025  
**Güncelleme Yapan**: Cascade AI  
**Durum**: ✅ Aktif ve Çalışıyor
