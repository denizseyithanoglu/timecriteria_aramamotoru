# TIME Kriterleri 2024 — Arama Motoru

Türkçe **TIME-to-STOP** ve **TIME-to-START** kriterlerini aramak için hazırlanmış, tarayıcıda çalışan, açık kaynak kodlu bir **klinik başvuru arayüzü**.

TIME Kriterleri, İstanbul Tıp Fakültesi Geriatri Bilim Dalı çalışmalarıyla ilişkili bir ilaç uygunluğu değerlendirme aracıdır. Bu arayüz **bağımsız bir dijital dizindir**; resmi kılavuz veya otomatik reçeteleme sistemi değildir.

## İçerik

| Kaynak | Kriter sayısı |
| --- | ---: |
| TIME-to-STOP (2024) | 129 |
| TIME-to-START (2024) | 61 |
| **Toplam** | **190** |

Veriler, proje sahibi tarafından sağlanan, 2024 tarihli **referanslı ve açıklamalı** TIME-to-START (45 sayfa) ve TIME-to-STOP (72 sayfa) PDF'lerinden otomatik olarak ayrıştırılmıştır.

- İlaç adı, klinik durum, kategori ve kriter koduyla arama
- START / STOP ve organ sistemine göre filtreleme
- Kriter açıklamaları ve bibliyografik referanslar
- Kaynak PDF sayfa numarası
- Kriter metni ve kriter bağlantısı kopyalama
- Mobil uyumlu, bağımlılıksız HTML/CSS/JavaScript
- Aramaların tamamı kullanıcının tarayıcısında çalışır; herhangi bir hasta verisi gönderilmez veya kaydedilmez

## GitHub Pages ile yayımlama

1. Repository'de **Settings → Pages** sayfasını açın.
2. **Build and deployment → Source** altında **Deploy from a branch** seçin.
3. **Branch: main**, **Folder: /(root)** seçin.
4. **Save** butonuyla kaydedin.

GitHub Pages etkinleştiğinde adres şu formatta olur:

https://denizseyithanoglu.github.io/timecriteria_aramamotoru/

## Dosya yapısı

- `index.html`: Arama arayüzü
- `styles.css`: Görünüm ve mobil düzen
- `app.js`: İstemci tarafında arama, filtreleme ve etkileşim
- `data/criteria.json`: Ayrıştırılmış kriter metinleri, notlar, referanslar ve kaynak sayfalar

`data/criteria.json` içinde her kayıt `id`, `type`, `code`, `category`, `page`, `text`, `notes` ve `references` alanlarına sahiptir.

Örnek kriter tanımlayıcıları: `STOP-A1` ve `START-A1`. Bu ayrım, iki belgede ortak kullanılan A1, B1 gibi kodların karışmasını önler.

## İçerik doğrulama ve klinik uyarı

**Önemli:** PDF içeriği otomatik olarak aktarıldı; bütün kriterlerin orijinal dokümanlarla klinisyen tarafından satır satır doğrulanması önerilir. Klinik kararlar hastanın durumuna, güncel kanıtlara, ilaç prospektüsüne ve uzman değerlendirmesine göre verilmelidir. 2024 kriterleri sonraki tarihli rehberlerin yerine geçmez.

Kaynak belgelerin kullanım ve yeniden yayımlama hakları ayrıca değerlendirilmelidir. Orijinal PDF dosyaları bu repository'ye eklenmemiştir. Veri dosyasının kamuya açık yayımlanması için de hak sahiplerinin izin/atıf koşullarını kontrol edin.

Hasta verileri, kimlik bilgileri veya hasta kayıtları bu depoya eklenmemelidir.
