# Stok Sayımı İşlemleri Geliştirme Planı

## Background and Motivation

Cremma sisteminde stok sayımı işlemleri için implementasyon geliştirmemiz gerekiyor. Mevcut sistemde stok-sayimi-olustur.html sayfasından başlayarak, sayımların SAP B1 backend sistemine iletilmesi sürecini inceleyip genişleteceğiz.

Bu projede stok sayım işlemleri için bir takım iyileştirmeler yapılmakta. Şu ana kadar stok-sayimi-olustur.html sayfasında, sayım işlemi tamamlandıktan sonra kullanıcının stok-sayimlarim.html sayfasına otomatik olarak yönlendirilmesi sağlandı.

Şu anda ise stok-sayimi-duzenle.html ekranında, mevcut stok sayımlarını düzenleme ve güncelleme işlemlerinin analizi yapılacak ve gerekli iyileştirmeler belirlenecektir.

## Key Challenges and Analysis

### Mevcut Stok Sayımı Düzenleme Ekranı Analizi

1. **Dosya Yapısı**:
   - stok-sayimi-duzenle.html: Sayfa yapısı ve stil tanımları
   - js/stok-sayimi-duzenle.js: Sayım düzenleme işlemlerinin gerçekleştirildiği JavaScript 
   - server.js (api/count-update): Güncelleme API endpoint'i

2. **Genel İş Akışı**:
   - Sayfa yüklendiğinde URL parametresi olarak alınan docNum ile sayım detayları `/api/count-detail/{docNum}` endpoint'inden çekilir
   - Veriler form alanlarına doldurulur (şube kodu, sayım numarası, sayım tarihi, durum)
   - Ürünler DataTable üzerinde listelenir ve miktar alanları düzenlenebilir halde gösterilir
   - Kullanıcı miktar değerlerini değiştirip "Güncelle" butonuna tıkladığında önce önizleme modalı gösterilir
   - Kullanıcı önizleme modalında "Güncelle" butonunu onayladığında, her ürün için ayrı bir `/api/count-update` API çağrısı yapılır

3. **Güncelleme API (count-update) Analizi**:
   - API, her seferinde bir ürün için güncelleme kabul ediyor
   - Veri yapısı: U_WhsCode, U_DocNum, U_RefDate, U_DocStatus, U_ItemCode, U_ItemName, U_Quantity, U_UomCode, U_GUID, U_SessionID, U_User alanlarını içeriyor
   - Backend tarafında ASUDO_B2B_COUNT_UPDATE endpoint'ine istek yapılıyor
   - Başarı/başarısızlık durumları count ve error count ile izleniyor

4. **Tespit Edilen İyileştirme Alanları**:
   - Her ürün için ayrı bir API çağrısı yapılması yerine, toplu güncelleme yapılabilir
   - Yükleme göstergesi eklenmeli ve kullanıcıya daha anlamlı geri bildirimler verilmeli
   - Bazı durumlarda GUID yönetimi tutarsız olabilir
   - Miktar değişimini tespit etmek ve sadece değişen ürünleri göndermek için mekanizma eklenebilir
   - Özellikle çok sayıda ürün olduğunda performans iyileştirmeleri gerekebilir
   - Tarih formatı standartlaştırılmalı (2020-01-01 formatında)

5. **SAP B1 Entegrasyon Detayları**:
   - ASUDO_B2B_COUNT_UPDATE yerine, toplu güncellemeler için ASUDO_B2B_COUNT endpoint'i kullanılabilir (PUT isteği ile)
   - Bazı API yanıtlarında hata işleme mekanizması güçlendirilmeli
   - Session timeout durumları kontrol edilmeli

## High-level Task Breakdown

**İyileştirme İhtiyaçları:**

1. **Toplu Güncelleme Mekanizması:** Her ürün için ayrı API çağrısı yerine, tek bir güncelleme işleminde tüm ürünleri gönderebilecek bir yapı kurulmalı
   - Mevcut analizlere göre, ürün oluşturmada kullanılan ASUDO_B2B_COUNT endpoint'i, PUT metodu ile güncelleme için de kullanılabilir
   - Doküman `AS_B2B_COUNT_DETAILCollection` altında birden çok ürün için toplu güncelleme destekliyor

2. **Performans İyileştirmeleri:**
   - Sadece değişen ürünleri tespit edip güncelleme için gönderme
   - DataTable yapısının büyük veri setleri için optimize edilmesi
   - Yükleme ve güncelleme işlemleri sırasında etkin geri bildirim
   - Batch işleme ile çok sayıda ürün olduğunda performans iyileştirmesi

3. **Kullanıcı Deneyimi İyileştirmeleri:**
   - Daha anlamlı yükleme göstergeleri
   - Değişikliklerin daha görsel olarak izlenmesi (değişen değerler farklı renkte gösterilebilir)
   - Miktar değiştirme kontrollerinin kullanım kolaylığının artırılması
   - Önizleme modalında daha fazla detay ve karşılaştırma (değişen/değişmeyen ürünlerin ayrılması)

4. **Hata Yönetimi Geliştirmeleri:**
   - API hatalarının daha anlamlı bir şekilde gösterilmesi
   - Session timeout durumlarının daha iyi yönetilmesi
   - Yeniden deneme mekanizması eklenmesi
   - Validasyon kontrolleri güçlendirilmesi

5. **Veri Güvenliği İyileştirmeleri:**
   - GUID tutarlılığı için daha iyi bir mekanizma
   - SAP B1 entegrasyonunda daha sağlam bir yapı
   - API yanıtlarının tutarlı bir şekilde işlenmesi

**Temel Görevler:**

1. Toplu güncelleme API implementasyonu
   - PUT metodu ile ASUDO_B2B_COUNT endpoint'ine güncelleme isteği gönderme
   - AS_B2B_COUNT_DETAILCollection yapısı içinde birden çok ürün gönderme
   - Batch mekanizması (25 ürün başına bir istek göndermek gibi)

2. Değişiklik takibi ve optimizasyon
   - Orijinal değerlerin saklanması ve sadece değişenlerin tespit edilmesi
   - Değişen ürünlerin UI'da görsel olarak belirtilmesi
   - Değişen ürünler için önizleme modalında karşılaştırma gösterilmesi 

3. UI iyileştirmeleri
   - Miktar değiştirme kontrollerinin iyileştirilmesi
   - İlerleme göstergelerinin geliştirilmesi
   - Önizleme modalında detaylı bilgi gösterimi

4. Hata yönetimi
   - Session timeout için interceptor
   - API hatalarını kullanıcıya daha anlamlı gösterme
   - Yeniden deneme mekanizması

5. Test ve optimizasyon
   - Büyük veri setleri için performans testleri
   - Hata durumlarının test edilmesi

## Project Status Board

- [ ] 1. Toplu Güncelleme API İmplementasyonu
  - [ ] 1.1 Frontend'de toplu güncelleme mekanizması implementasyonu
    - [ ] 1.1.1 Tek istekte tüm ürünleri gönderecek şekilde submitUpdates() fonksiyonunu güncelleme
    - [ ] 1.1.2 AS_B2B_COUNT_DETAILCollection yapısını oluşturma
    - [ ] 1.1.3 PUT metodu ile ASUDO_B2B_COUNT endpoint'ine güncelleme isteği gönderme
  - [ ] 1.2 Orijinal değerlerin saklanması ve sadece değişenlerin tespit edilmesi
    - [ ] 1.2.1 Ürünler yüklendiğinde orijinal değerlerin deep copy olarak saklanması
    - [ ] 1.2.2 Değişiklikleri tespit eden bir karşılaştırma fonksiyonu eklenmesi
    - [ ] 1.2.3 Sadece değişen ürünlerin API'ye gönderilmesi
  - [ ] 1.3 Batch işlem mekanizması
    - [ ] 1.3.1 Ürün sayısı belirli bir eşiği aştığında batch'lere ayırma
    - [ ] 1.3.2 Her batch için ayrı istek gönderme ve sonuçları birleştirme

- [ ] 2. Kullanıcı Arayüzü İyileştirmeleri
  - [ ] 2.1 Miktar değiştirme kontrollerinin kullanım kolaylığının artırılması
    - [ ] 2.1.1 Artırma/azaltma butonlarının daha kullanıcı dostu hale getirilmesi
    - [ ] 2.1.2 Miktar değiştiğinde görsel geri bildirim eklenmesi
  - [ ] 2.2 Değişikliklerin görsel olarak izlenmesi için UI elemanları
    - [ ] 2.2.1 Değişen değerlerin farklı stilde gösterilmesi (örn: renk değişimi)
    - [ ] 2.2.2 Orijinal değerle yeni değerin yan yana gösterilmesi
  - [ ] 2.3 Önizleme modalında daha fazla detay ve karşılaştırma
    - [ ] 2.3.1 Değişen ve değişmeyen ürünlerin ayrı listelenmesi
    - [ ] 2.3.2 Orijinal değer ve yeni değerin yan yana gösterilmesi
  - [ ] 2.4 Daha anlamlı yükleme göstergeleri
    - [ ] 2.4.1 İlerleme çubuğu eklenmesi
    - [ ] 2.4.2 Batch işlemler için aşama göstergesi

- [ ] 3. Hata Yönetimi Geliştirmeleri
  - [ ] 3.1 API hatalarının daha anlamlı gösterilmesi
    - [ ] 3.1.1 Hata mesajlarını daha kullanıcı dostu hale getirme
    - [ ] 3.1.2 Hata türüne göre özel mesajlar gösterme
  - [ ] 3.2 Session timeout durumlarının yönetilmesi
    - [ ] 3.2.1 Session kontrolü için interceptor eklenmesi
    - [ ] 3.2.2 Timeout durumunda login sayfasına otomatik yönlendirme
  - [ ] 3.3 Yeniden deneme mekanizması
    - [ ] 3.3.1 server.js'deki retryAxiosRequest benzeri bir mekanizmayı client tarafına ekleme
    - [ ] 3.3.2 Geçici hatalarda otomatik yeniden deneme yapma
  - [ ] 3.4 Validasyon kontrolleri
    - [ ] 3.4.1 Form validasyonlarının güçlendirilmesi
    - [ ] 3.4.2 API'ye gönderilmeden önce veri doğrulama

- [ ] 4. Test ve Optimizasyon
  - [ ] 4.1 Büyük veri setleri için performans testleri
    - [ ] 4.1.1 Çok sayıda ürün (100+) ile test
    - [ ] 4.1.2 Batch mekanizmasının etkinliğinin doğrulanması
  - [ ] 4.2 Farklı tarayıcı ve cihazlarda test edilmesi
    - [ ] 4.2.1 Mobil uyumluluk testleri
    - [ ] 4.2.2 Farklı tarayıcılarda tutarlı çalışmanın doğrulanması
  - [ ] 4.3 Toplu güncelleme işlemlerinin sınır durumlarının test edilmesi
    - [ ] 4.3.1 Hiçbir değişiklik olmadığında davranış
    - [ ] 4.3.2 Bazı ürünlerin güncellemesinin başarısız olması durumu
    - [ ] 4.3.3 Session timeout durumunda davranış

## Current Status / Progress Tracking

Stok sayımı düzenleme ekranında aşağıdaki önemli iyileştirmeler yapıldı:

1. Toplu Güncelleme Mekanizması:
   - Her ürün için ayrı API çağrısı yapmak yerine, tüm ürünleri tek bir istek içinde gönderebilen AS_B2B_COUNT_DETAILCollection yapısı implementasyonu tamamlandı.
   - PUT metodu ile ASUDO_B2B_COUNT(DocNum) endpoint'ine toplu güncelleme isteği gönderiliyor.
   - Retry mekanizması eklendi, geçici API hatalarını tekrar deneyerek çözebiliyor.

2. Değişen Ürünleri Tespit Mekanizması:
   - Ürünler yüklendiğinde orijinal değerlerin deep copy olarak saklanması için mekanizma eklendi.
   - Sadece değişiklik yapılan ürünlerin tespiti ve görsel olarak vurgulanması sağlandı.
   - Sayaç ve değişiklik takip mekanizması ile değişen ürünlerin anlık takibi yapılabilir.

3. Kullanıcı Arayüzü İyileştirmeleri:
   - İlerleme çubuğu eklendi, kullanıcıya işlem durumu hakkında daha iyi geribildirim veriliyor.
   - Değişiklik yapılan ürünler görsel olarak vurgulanıyor (arka plan rengi değişimi).
   - Sayım önizleme modalı sayım öncesi tüm değişiklikleri görsel olarak kontrol etme imkanı sağlıyor.
   - Değişen ürünler bir sayaç ile gösteriliyor ve filtreleme imkanı eklendi.
   - Ürünlerin miktar değerlerini artırma/azaltma için butonlar eklendi.

4. Server.js içinde PUT metodu desteği:
   - ASUDO_B2B_COUNT endpoint'i için PUT metodu desteği eklendi.
   - Hata işleme ve otomatik yeniden deneme mekanizmaları geliştirildi.
   - SAP oturumunda hata oluşması durumunda otomatik yeniden bağlanma.

5. Şube Kodu ve Sayım Numarası Koruması:
   - Şube kodu ve sayım numarası alanları readonly olarak ayarlandı.
   - JavaScript seviyesinde ek önlemler eklendi, bu alanların değiştirilmesi engellendi.

6. `/api/count-update` Endpoint İyileştirmeleri:
   - Session kontrol mekanizması düzeltildi - `sessions` nesnesi yerine doğrudan `sessionId` kullanılıyor
   - Veri formatı doğrulama mekanizması geliştirildi
   - Tüm zorunlu alanlar için kapsamlı doğrulama kontrolleri eklendi
   - İstemciden gelen farklı anahtar formatları (prefixli/prefixsiz) destekleniyor
   - Hata ayıklama ve loglama yetenekleri geliştirildi
   - Koleksiyondaki her bir öğe için detaylı validasyon eklendi

## Executor's Feedback or Assistance Requests

`/api/count-update` endpoint'inde şu iyileştirmeler yapıldı:

1. **Session Kontrol Mekanizması Düzeltildi**
   - Önceki kodda `sessions` nesnesine erişim hatası vardı, şimdi doğrudan `sessionId` kullanılıyor
   - Hem HTTP başlıklarından hem de sorgu parametrelerinden session ID alınabiliyor

2. **Veri Doğrulama Geliştirildi**
   - WhsCode alanı için zorunluluk kontrolü eklendi
   - Koleksiyondaki her bir öğe için tüm zorunlu alanların varlığı kontrol ediliyor
   - Geçersiz öğeler tespit edilip, kullanıcıya anlamlı hata mesajları döndürülüyor

3. **Veri Formatı İyileştirildi**
   - SAP B1 için gerekli tüm alanların U_ önekine sahip olması sağlandı
   - Hem önekli (U_ItemCode) hem de öneksiz (ItemCode) alan isimlendirmesi destekleniyor
   - Miktar (Quantity) alanı için daha sağlam parseFloat işlemi eklendi

4. **Hata Ayıklama ve Loglama Yetenekleri Geliştirildi**
   - Daha detaylı ve yapılandırılmış loglar eklendi
   - API isteği ve yanıtı daha net görüntüleniyor
   - Olası veri sorunlarını belirlemek için kapsamlı kontroller eklendi

5. **Güvenlik İyileştirmeleri**
   - Session ID'nin tamamı loglarda gösterilmiyor (sadece ilk 5 karakter)
   - GUID ve User değerleri için daha sağlam yedek mekanizmaları eklendi

Bu değişiklikler sayesinde, stok sayımı güncelleme işlemi daha güvenilir ve hata ayıklanabilir hale geldi. İstemci tarafından değişiklik yapılmasına gerek yoktur, çünkü endpoint geriye dönük uyumluluğu korumaktadır.

## Lessons

1. Düzenleme işleminde orijinal değerleri saklamak ve takip etmek için deep copy mekanizması kullanmak gerekiyor.
2. SAP B1 API'sine PUT istekleri gönderirken doğru veri yapısı (AS_B2B_COUNT_DETAILCollection) önemli.
3. Modal içeriğini dinamik olarak güncellemek ve modal içindeki kontroller ile dış formları senkronize etmek için event handling'e dikkat etmek gerekiyor.
4. Port çakışması durumunda alternatif port kullanımı için argüman geçişi sağlamak faydalı.
5. Sayım düzenleme işleminde değişen kayıtlar olmazsa bile tüm verileri gönderme seçeneği sunulmalı.
6. Bootstrap ile çalışırken modalların açılıp kapanmasında getInstance metodu kullanılmalı.
7. API endpoint'lerinde session yönetimi için sessions objesi yerine doğrudan query parameters veya HTTP headers kullanmak daha güvenilir.
8. Hata ayıklama için detaylı ve yapılandırılmış loglar eklemek sorun giderme sürecini hızlandırır.
9. Validasyon kontrollerini hem frontend hem de backend tarafında yapmak önemlidir.
10. API yanıtlarında anlamlı hata mesajları sağlamak, client tarafında daha iyi kullanıcı deneyimi sunar.

# Dark Mode Implementation Plan

## Background and Motivation

The client has requested to add a dark mode feature to the website. The website currently has a light theme, and we need to implement a dark mode option that users can toggle between. We'll use the existing CSS, loadHeader.js, and sidebar-user.js files to implement this feature.

## Key Challenges and Analysis

1. **CSS Structure**:
   - The current CSS uses a `:root` element with CSS variables for colors
   - Need to create additional CSS variables for dark mode colors
   - Need to ensure all UI elements adapt to the dark mode correctly

2. **Toggle Mechanism**:
   - Need to add a toggle button in the sidebar user section
   - Need to store user preference in localStorage
   - Need to detect and apply the user's system preference for dark/light mode when available

3. **Implementation Approach**:
   - Create a new CSS class `.dark-mode` that will be added to the `body` element
   - Define dark mode color variables
   - Implement JavaScript to toggle between light and dark mode
   - Add a toggle button in the sidebar user section
   - Store user preference in localStorage

4. **Special Considerations**:
   - DataTables compatibility with dark mode
   - Ensuring modals, dropdowns, and other Bootstrap components adapt to dark mode
   - Badges, buttons, and form elements need special attention
   - SweetAlert2 and other third-party components need styling

## High-level Task Breakdown

1. **Update CSS with dark mode variables and classes**
   - Add dark mode color variables to the `:root` element in style.css
   - Create styles for `.dark-mode` class to override light mode colors
   - Ensure all components have proper dark mode styling

2. **Create a dark mode toggle button**
   - Add a toggle button to the sidebar_user.html component
   - Style the toggle button for both light and dark modes

3. **Implement JavaScript functionality**
   - Create a new file `js/dark-mode.js` to handle dark mode toggling
   - Add functionality to toggle between light and dark modes
   - Store user preference in localStorage
   - Check system preference for initial state

4. **Update loadHeader.js**
   - Add the dark-mode.js script to be loaded when the page loads
   - Ensure dark mode is applied before page rendering to avoid flicker

5. **Add DataTables compatibility**
   - Create specific styles for DataTables in dark mode
   - Update datatable-helper.js to handle dark mode changes

6. **Add specific fixes for HTML components**
   - Create a separate CSS file for component-specific fixes
   - Handle modals, dropdowns, badges, and other Bootstrap components

7. **Test and refinement**
   - Test dark mode on various screen sizes
   - Ensure all UI elements adapt correctly to dark mode
   - Verify that user preference is preserved between sessions

## Project Status Board

- [x] 1. Update CSS with dark mode variables and classes
  - [x] 1.1 Add dark mode color variables to style.css
  - [x] 1.2 Create styles for .dark-mode class
  - [x] 1.3 Ensure all components have proper dark mode styling

- [x] 2. Create a dark mode toggle button
  - [x] 2.1 Design a toggle button UI component
  - [x] 2.2 Add toggle button to sidebar_user.html
  - [x] 2.3 Style the toggle button for both light and dark modes

- [x] 3. Implement JavaScript functionality
  - [x] 3.1 Create js/dark-mode.js file
  - [x] 3.2 Add functionality to toggle between modes
  - [x] 3.3 Implement localStorage for preference storage
  - [x] 3.4 Add system preference detection

- [x] 4. Update loadHeader.js
  - [x] 4.1 Add dark-mode.js to be loaded
  - [x] 4.2 Ensure dark mode is applied before page rendering

- [x] 5. Add DataTables compatibility
  - [x] 5.1 Create specific styles for DataTables in dark mode
  - [x] 5.2 Update datatable-helper.js to handle dark mode changes

- [x] 6. Add specific fixes for HTML components
  - [x] 6.1 Create dark-mode-fixes.css for component-specific fixes
  - [x] 6.2 Include the new CSS file in header.html
  - [x] 6.3 Add fixes for modals, dropdowns, badges, and other components

- [ ] 7. Testing and refinement
  - [ ] 7.1 Test on various screen sizes
  - [ ] 7.2 Verify all UI elements adapt correctly
  - [ ] 7.3 Test user preference persistence

## Current Status / Progress Tracking

The dark mode implementation is complete with enhancements. We have successfully:

1. Added dark mode CSS variables and styling in style.css
2. Added a toggle button in the sidebar_user.html component
3. Created dark mode toggle functionality in dark-mode.js
4. Updated loadHeader.js for early initialization to prevent flash
5. Integrated with sidebar-user.js for proper loading
6. Enhanced dark mode for DataTables by updating datatable-helper.js
7. Created a dedicated dark-mode-fixes.css file for component-specific fixes
8. Added dark mode support for various Bootstrap and third-party components
9. Updated header.html to include the new CSS file

The implementation includes:
- User preference storage in localStorage
- System preference detection
- Theme color updates for mobile devices
- Smooth transitions between modes
- Prevention of flash of unstyled content
- Event system for notifying scripts about dark mode changes
- Special handling for DataTables and other complex components
- Comprehensive fixes for modals, forms, and other UI elements

## Executor's Feedback or Assistance Requests

The enhanced dark mode implementation is now ready for testing. Here's what's been done:

1. Modified style.css to include dark mode variables and classes
2. Created dark-mode.js to handle the toggle functionality and preference storage
3. Added a dark mode toggle button to sidebar_user.html
4. Updated loadHeader.js to load the dark-mode.js script
5. Enhanced sidebar-user.js to work with the dark mode toggle
6. Updated datatable-helper.js to provide dark mode support for DataTables
7. Created dark-mode-fixes.css with component-specific fixes
8. Added the new CSS file to header.html

To test the implementation:
1. Load any page with the sidebar
2. Click the sun/moon icon in the sidebar user section
3. Verify that the page switches between light and dark modes
4. Check DataTables components to ensure they display correctly in dark mode
5. Test forms, modals, and other UI components in dark mode
6. Reload the page and verify that the preference is preserved
7. Test on different devices and browsers

## Lessons

- Using CSS variables makes it easier to implement theme switching
- Setting theme-related meta tags improves the mobile experience
- Early initialization prevents flickering when loading pages
- Component-specific fixes are often needed for third-party libraries
- Event system helps coordinate dark mode changes across different scripts
- It's important to check all UI components to ensure they adapt correctly
- Using a separate CSS file for fixes helps with organization and maintenance
- Dark mode implementation should follow the existing design patterns
- DataTables require special handling for dark mode
- Custom components like SweetAlert2 need specific dark mode styling

# Fix for /api/count-update Endpoint Error

## Background and Motivation

The stock count editing functionality in the web application interfaces with SAP B1, but the API endpoint `/api/count-update` in the `server.js` file has an issue with handling sessions. According to the error messages and code analysis, we need to fix how session information is extracted and used. Additionally, some formatting improvements are needed to ensure the data structure matches SAP B1 requirements.

## Key Challenges and Analysis

1. **Session Handling Issue**:
   - There's an error with accessing `sessions`, but the code is trying to get sessionId from headers or query parameters
   - Need to ensure consistent session ID extraction and handling
   - Error handling for missing or invalid session IDs needs improvement

2. **Data Structure Format**:
   - The endpoint needs to format data correctly for SAP B1 API
   - All fields in the items collection need to have the U_ prefix
   - Need to ensure proper mapping between client-side fields and SAP B1 expected fields

3. **Error Logging Improvements**:
   - The current logging could be enhanced for easier debugging
   - Better structured logs will help diagnose issues with API integration
   - Request and response data should be better formatted in logs

4. **Validation Improvements**:
   - Additional validation checks for required fields
   - More robust error reporting for specific data issues
   - Clear feedback to client applications about data format problems

## High-level Task Breakdown

1. **Fix Session Handling**
   - Update session extraction logic to properly get sessionId from headers or query parameters
   - Remove references to non-existent sessions object
   - Improve error messages for missing session information

2. **Enhance Data Formatting**
   - Ensure all fields in AS_B2B_COUNT_DETAILCollection have the U_ prefix
   - Verify the structure matches SAP B1 requirements
   - Handle both pre-prefixed and non-prefixed fields from the client

3. **Improve Logging**
   - Add more structured logging for request data
   - Add detailed logging for request/response headers and data
   - Format log output for easier debugging

4. **Enhance Validation**
   - Add detailed validation for all required fields
   - Provide specific error messages for missing or invalid fields
   - Validate the structure of the request data before sending to SAP B1

## Project Status Board

- [x] 1. Fix Session Handling
  - [x] 1.1 Update session extraction logic in /api/count-update endpoint
  - [x] 1.2 Refactor sessions references to use direct sessionId
  - [x] 1.3 Add better error handling for missing session information

- [x] 2. Enhance Data Formatting
  - [x] 2.1 Ensure all fields in AS_B2B_COUNT_DETAILCollection have U_ prefix
  - [x] 2.2 Verify data structure matches SAP B1 requirements
  - [x] 2.3 Handle different field naming patterns from client

- [x] 3. Improve Logging
  - [x] 3.1 Add structured logging for request data
  - [x] 3.2 Add detailed logging for API communication
  - [x] 3.3 Format log output for easier debugging

- [x] 4. Enhance Validation
  - [x] 4.1 Add detailed validation for all required fields
  - [x] 4.2 Provide specific error messages for validation failures
  - [x] 4.3 Validate request data structure before sending to SAP B1 