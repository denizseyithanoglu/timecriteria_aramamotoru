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
- **12 organ/klinik alan kartı üzerinden gezinme:** sistem → isteğe bağlı hastalık filtresi → START ve STOP sonuçları birlikte. PDF bölümü filtresi ve START/STOP seçimi de korunur.
- START / STOP ve organ sistemine göre filtreleme
- Kriter açıklamaları ve bibliyografik referanslar
- Kaynak PDF sayfa numarası
- Kriter metni ve kriter bağlantısı kopyalama
- Mobil uyumlu, bağımlılıksız HTML/CSS/JavaScript
- Aramaların tamamı kullanıcının tarayıcısında çalışır; herhangi bir hasta verisi gönderilmez veya kaydedilmez
- Yanlış yazımlarda tıklanabilir **“Şunu mu demek istediniz?”** önerileri (Damerau–Levenshtein)
- Türkçe/İngilizce etken madde adları ve doğrulanmış piyasa adlarıyla arama (ör. abiksaban → apiksaban, Eliquis → apiksaban)
- [İlaç adları sözlüğü](./ilac-sozlugu.html) sayfası: etken madde, eş anlamlı, TIME ilaç grubu ve TİTCK piyasa adı eşleştirmeleri
- **İlaç sınıfı araması:** Delix → ramipril → ACEİ/RAS, DULOXX veya `dulox` → duloksetin → SNRI. SSRI ve SNRI ayrı tutulur.
- **Kısmi marka araması:** Sadece aynı etken maddeye karşılık gelen tek anlamlı marka önekleri otomatik çözümlenir. Çelişen/ambiguous isimler otomatik eşleştirilmez.

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
- `data/medicine_classes.json`: TIME metninde geçen 9 ilaç grubu için seçilmiş etken madde üyelikleri ve sınıf terimleri
- `data/class_member_brands.json`: Kullanıcının TİTCK Excel dosyasından TIME ilaç sınıflarıyla ilişkili 43 ek etken madde girdisi ve 194 seçilmiş piyasa adı (kombinasyonlar hariç; IV demir formları ayrı doğrulanır)
- `data/organ_systems.json`: 12 organ/klinik alan, PDF bölüm başlığı eşleştirmeleri ve ilgili hastalık alt filtreleri
- `data/clinical_aliases.json`: Tanı adları, kısaltmalar ve incelenmiş kriter–hastalık eşleştirmeleri
- `search-helpers.js`: İlaç adı, sınıf, kısaltma ve yazım önerisi motoru
- `tests/search-smoke.cjs`: Değişiklik sonrası arama regresyon testleri; `node tests/search-smoke.cjs`
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
- **20 Kasım 2026 güncellemesi:** Önceki eksikliği gidermek için metinde ilaç **sınıfı** olarak anılan seçilmiş üyeler de eklendi; ör. ramipril → ACE inhibitörü, atorvastatin → statin, duloksetin → SNRI. İlaç sınıfı üyelikleri ayrı ve denetlenebilir `medicine_classes.json` dosyasında tutuluyor. Bu genişletme bütün sınıf üyelerinin tam listesi değildir; klinik gözden geçirme gerektirir.
- 54 girdilik ilk sözlükten İngilizce adlar ve yazım varyantları alındı. Piyasa adı aramasının güncel esas veri kaynağı artık **TİTCK ile eşleştirilmiş dosyadır**.
- Bu otomatik aktarım **provisional** durumundadır; ticari ad ayrıştırma hataları bulunabilir ve klinisyen tarafından kontrol edilmelidir. TİTCK listesinde bulunmak, ürünün eczanelerde satıldığını veya bulunabildiğini garanti etmez.
- Orijinal 23 binden fazla satırlık Excel listesi GitHub deposuna yüklenmedi. Yalnızca TIME kapsamındaki süzülmüş isimler yayımlandı.

Bu yaklaşım kaynak gösterimini sağlar; **kaynağın kamuya açık olması bütün verilerin serbest lisanslı olduğu anlamına gelmez**. Yeniden kullanım / veri tabanı hakları açısından gerekli izinlerin ayrıca değerlendirilmesi önerilir. Veriler kişisel hasta bilgisi içermez.

**Klinik güvenlik:** Bir marka adıyla eşleşme tedavinin uygun olduğunu göstermez. Birden fazla etken maddeli ürünler yanlış sınıflandırılmaması için kapsam dışı bırakılmıştır. Yanlış yazım önerileri kullanıcı onayı olmadan otomatik uygulanmaz.

## İlaç sınıfı araması: sonuçların yorumu

Yalnızca kriterin **ana açıklama metninde** ilgili sınıf açıkça geçiyorsa sınıf eşleşmesi yapılır. Ek notlarda veya bibliyografyada bir ilaç adı geçmesi, kendi başına sınıf eşleşmesi oluşturmaz. Eşleşen sonuç kartları, sınıf ilişkisinin otomatik olduğunu ve kriterin klinik şartlarının ayrıca değerlendirilmesi gerektiğini belirtir.

Örnekler:
- `Delix` / `ramipril` / `ACE-I`: TIME'daki ACE inhibitörü ve RAS blokeri kriterleri;
- `dulox` / `DULOXX` / `duloxetine`: **duloksetin (SNRI)**, doğrudan duloksetin ve SNRI kriterleri;
- `Cipralex` / `Lustral`: ilgili **SSRI** grubu kriterleri;
- `Lipitor`: **atorvastatin**, statin kriterleri.

**Uyarı:** DULOXX etken maddesi duloksetin **SSRI değil SNRI** grubundadır. Delix Plus gibi **kombinasyon ürünleri**, tek etkin maddeli Delix gibi yorumlanmaz. Kısmi piyasa adları ancak aynı etkin maddeye doğru tek anlamlı çözülüyorsa eşlenir.

Geliştirici testi: `node tests/search-smoke.cjs` (ek paket gerekmez).

Kaynaklar: 2024 TIME kriter belgeleri, kullanıcı tarafından sağlanan TİTCK listesi; ATC sınıflarının kontrolü için [WHO ATC/DDD](https://atcddd.fhi.no/atc_ddd_index/).


## Organ sistemi ve hastalık bazlı gezinme (20 Kasım 2026)

Ana sayfadaki **“Organ sistemine göre incele”** kartlarından kardiyovasküler, nöroloji-psikiyatri, gastrointestinal, solunum, kas-iskelet, endokrin-metabolizma, böbrek, ürogenital, kan-anemi, aşılar, beslenme-suplemanlar veya antikolinerjik yük alanı seçilebilir. Seçilen alana uygun hastalıklar ikinci açılır menüden belirlenebilir. START/STOP sekmeleri ile birlikte kullanılabilir. Kullanıcıya gösterilen sistemler 2024 TIME PDF'sinin bölüm başlıklarına dayalıdır; **“Kan ve anemi”** istisnai olarak üç farklı bölümden `START-A10`, `START-H3`, `STOP-C6` kriterlerini bir araya getiren *tematik* görünümdür, orijinal PDF başlığı değildir.

BPH ve romatoid artrit gibi Türkçe çekim ekleri nedeniyle daha önce aranamayan tanılar için ayrıca incelenmiş kriter kodları tanımlanmıştır. Bu filtreler kişiye özgü karar motoru değildir; kriterin tam metnine ve klinik koşullarına bakılması gerekir.

## İntravenöz demir örneği

TİTCK'nin proje sahibi tarafından sağlanan 6 Kasım 2026 isimli XLSX dosyasındaki **B03AC** satırları ve **uygulama yolu** kontrol edilmiştir. `İNFERJECT` (demir karboksimaltoz), `Ferapplic`, `Ferdepo`, `Venofer`, `Sukrofer` ve diğer seçilmiş, **IV** preparatlar `data/class_member_brands.json` dosyasına eklendi. Aynı veride bulunan **IM** demir ürünleri IV demir grubuna eklenmemiştir.

- `Inferject` → demir karboksimaltoz → **intravenöz demir** → `START-A10`
- `Venofer` → ferrik hidroksit sükroz kompleksi → **intravenöz demir** → `START-A10`
- `oral demir` → **`STOP-C6`**; `START-A10` ile otomatik birleştirilmez.

Eşleştirme sadece kriter bulmaya yarar; `START-A10` tedavi endikasyonundaki kalp yetersizliği ve ferritin/transferrin saturasyonu koşullarının ayrı değerlendirilmesi zorunludur.

**Test:** `node tests/search-smoke.cjs` komutu 25 klinik/ilaç sorgusunu ve 15 güvenlik veya filtre kontrolünü çalıştırır. Bu testler otomatik metin ve sınıf eşleştirmesini kontrol eder, klinik içerik doğrulamasının yerine geçmez.
