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
- Yanlış yazımlarda tıklanabilir **“Şunu mu demek istediniz?”** önerileri (Damerau–Levenshtein)
- Türkçe/İngilizce etken madde adları ve doğrulanmış piyasa adlarıyla arama (ör. abiksaban → apiksaban, Eliquis → apiksaban)
- [İlaç adları sözlüğü](./ilac-sozlugu.html) sayfası: etken madde, eş anlamlı ve mevcut piyasa adı eşleştirmeleri

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
- `data/medicine_aliases.json`: İngilizce/Türkçe etken madde eşanlamları (ilk sürümden korunur); piyasa adları için resmi kaynak yerine geçmez
- `data/titck_time_brands.json`: **TİTCK listesi ile TIME 2024 kriter metinlerinin kesişimi**: 148 etken madde, 1.235 tekilleştirilmiş piyasa adı; 442 kombinasyon ürün satırı kapsam dışı bırakıldı.
- `search-helpers.js`: İlaç adı eşleştirme ve yazım önerisi motoru
- `ilac-sozlugu.html`, `directory.js`: Sözlüğü inceleme sayfas

`data/criteria.json` içinde her kayıt `id`, `type`, `code`, `category`, `page`, `text`, `notes` ve `references` alanlarına sahiptir.

Örnek kriter tanımlayıcıları: `STOP-A1` ve `START-A1`. Bu ayrım, iki belgede ortak kullanılan A1, B1 gibi kodların karışmasını önler.

## İçerik doğrulama ve klinik uyarı

**Önemli:** PDF içeriği otomatik olarak aktarıldı; bütün kriterlerin orijinal dokümanlarla klinisyen tarafından satır satır doğrulanması önerilir. Klinik kararlar hastanın durumuna, güncel kanıtlara, ilaç prospektüsüne ve uzman değerlendirmesine göre verilmelidir. 2024 kriterleri sonraki tarihli rehberlerin yerine geçmez.

Kaynak belgelerin kullanım ve yeniden yayımlama hakları ayrıca değerlendirilmelidir. Orijinal PDF dosyaları bu repository'ye eklenmemiştir. Veri dosyasının kamuya açık yayımlanması için de hak sahiplerinin izin/atıf koşullarını kontrol edin.

Hasta verileri, kimlik bilgileri veya hasta kayıtları bu depoya eklenmemelidir.

## TİTCK kaynaklı ilaç sözlüğü: kapsam ve provenance

**Kaynak:** [TİTCK Ruhsatlı Beşeri Tıbbi Ürünler Listesi](https://www.titck.gov.tr/dinamikmodul/85).

Proje sahibi tarafından sağlanan `RuhsatlBeeriTbbirnlerListesi06.11.2026_...xlsx` dosyasının “RUHSATLI ÜRÜNLER LİSTESİ” çalışma sayfası taranarak oluşturuldu. **Dosyanın adı** 6 Kasım 2026 tarihini taşısa da TİTCK'nin web sayfasında görülen en son resmi liste yayım tarihi **30 Ekim 2026** olduğundan bu adın resmi yayımlanma tarihi olduğu iddia edilmemektedir.

- TIME-to-START ve TIME-to-STOP kriter açıklamalarında açıkça adı geçen etken madde isimleriyle eşleştirildi.
- TİTCK dosyasında **“ruhsatı askıda olmayan ürün: 0”** olarak işaretlenmiş satırlar filtrelendi.
- Birden fazla etken madde içeren **442 ürün satırı** otomatik eşleştirmeden çıkarıldı. Tek bileşenli ürünler için farklı doz/ambalaj satırları aynı ticari isim altında birleştirildi.
- Sonuç: **148 ilaç girdisi ve 1.235 piyasa adı** (`data/titck_time_brands.json`).
- Metinde yalnızca ilaç **sınıfı** olarak anılan üyeler (örn. tüm statinler) sınıf adı üzerinden topluca eklenmedi. Bu tür klinik genişletme ayrıca incelenmelidir.
- 54 girdilik ilk sözlükten İngilizce adlar ve yazım varyantları alındı. Piyasa adı aramasının güncel esas veri kaynağı artık **TİTCK ile eşleştirilmiş dosyadır**.
- Bu otomatik aktarım **provisional** durumundadır; ticari ad ayrıştırma hataları bulunabilir ve klinisyen tarafından kontrol edilmelidir. TİTCK listesinde bulunmak, ürünün eczanelerde satıldığını veya bulunabildiğini garanti etmez.
- Orijinal 23 binden fazla satırlık Excel listesi GitHub deposuna yüklenmedi. Yalnızca TIME kapsamındaki süzülmüş isimler yayımlandı.

Bu yaklaşım kaynak gösterimini sağlar; **kaynağın kamuya açık olması bütün verilerin serbest lisanslı olduğu anlamına gelmez**. Yeniden kullanım / veri tabanı hakları açısından gerekli izinlerin ayrıca değerlendirilmesi önerilir. Veriler kişisel hasta bilgisi içermez.

**Klinik güvenlik:** Bir marka adıyla eşleşme tedavinin uygun olduğunu göstermez. Birden fazla etken maddeli ürünler yanlış sınıflandırılmaması için kapsam dışı bırakılmıştır. Yanlış yazım önerileri kullanıcı onayı olmadan otomatik uygulanmaz.
