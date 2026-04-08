# 🔐 SQL Injection — Zəiflik Analiz Hesabatı

> **Hədəf Sistem:** SteamCoupons `/login` endpoint  
> **Texnologiya:** Node.js + better-sqlite3  
> **Risk Səviyyəsi:** ![Critical](https://img.shields.io/badge/CVSS-9.8%20KRİTİK-red)  
> **Hesabat Tarixi:** 8 Aprel 2025

---

> ⚠️ **Vacib Qeyd:** Bu hesabat yalnız **təhsil məqsədi** ilə hazırlanmışdır. Real sistemlərə icazəsiz giriş cəhdi qanun pozuntusudur. Həmişə qanuni penetration testing çərçivəsində fəaliyyət göstərin.

---

## 📋 Mündəricat

- [İcmal](#-i̇cmal)
- [Zəifliyin Texniki Təsviri](#-zəifliyin-texniki-təsviri)
- [Alternativ Payload-lar](#-alternativ-payload-lar)
- [Təsir Analizi](#-təsir-analizi)
- [CVSS Qiymətləndirməsi](#-cvss-qiymətləndirməsi)
- [Düzəltmə Yolları](#-düzəltmə-yolları)
- [Hücum Ssenarisi](#-hücum-ssenarisi)
- [Nəticə](#-nəticə)

---

## 📌 İcmal

Bu hesabat SteamCoupons platformunun giriş sistemindəki **kritik SQL Injection zəifliyini** ətraflı təhlil edir. Zəiflik autentifikasiya modulunda — konkret olaraq `/login` POST endpoint-ində aşkar edilmişdir.

SQL Injection, **OWASP Top 10** siyahısında birinci yerdə qərar tutur və onilliklər ərzində ən geniş yayılmış veb zəifliyi olaraq qalır. Bu zəiflik, təcavüzkarın veritabanı sorğularına ixtiyari SQL kodu yeritmənə imkan verir.

---

## 🔍 Zəifliyin Texniki Təsviri

### Zəif Kod — Problemin Mənbəyi

`server.js` faylının `/login` POST handler-ında aşağıdakı zəif kod mövcuddur:

```js
// ❌ ZƏİF KOD — server.js
const query = `SELECT * FROM users WHERE username = '${username}'`;
let user = db.prepare(query).get();
```

**Niyə bu zəiflikdir?**  
İstifadəçinin daxil etdiyi `username` dəyəri birbaşa SQL sətrinə birləşdirilir. Parametrized query istifadə edilmədikdə, istifadəçi daxiletməsi SQL kodunun bir hissəsi kimi şərh edilir. Nəticədə təcavüzkar SQL məntiqi dəyişdirərək autentifikasiyanı yan keçə bilər.

---

### Hücumun İcrası — Addım-Addım

**Addım 1 — Normal login sorğusu:**

```
Username: john_doe
Password: user123
```

Serverdə yaradılan SQL:
```sql
SELECT * FROM users WHERE username = 'john_doe'
```

**Addım 2 — SQL Injection payload daxil edilir:**

```
Username: admin'--
Password: anything
```

Serverdə yaradılan final SQL:
```sql
SELECT * FROM users WHERE username = 'admin'--'
```

**Addım 3 — SQL şərhi — nə baş verir?**

`--` simvolu SQL-də şərh başlanğıcıdır. Bundan sonrakı hər şey (o cümlədən şifrə yoxlaması) şərh kimi nəzərə alınmır:

- `'admin'` → veritabanında mövcud olan admin istifadəçisini axtarır
- `--` → qalan hissəni şərh edir, şifrə yoxlaması tamamilə aradan qalxır
- **Nəticə:** Admin istifadəçisi tapılır, heç bir şifrə tələb olunmur ✅

---

## 💣 Alternativ Payload-lar

| Payload | Məqsəd | Nəticə |
|---|---|---|
| `admin'--` | Admin kimi daxil olmaq | Şifrəsiz admin girişi |
| `admin' OR '1'='1` | İlk istifadəçi kimi giriş | DB-nin ilk sırasını qaytarır |
| `' OR 1=1 --` | İstənilən istifadəçi | Şərtsiz giriş |
| `'; DROP TABLE users; --` | Cədvəl silmə | Bütün istifadəçilər silinir |
| `' UNION SELECT * FROM users --` | Data sızması | Bütün user məlumatları |

---

## ⚠️ Təsir Analizi

### Birbaşa Risklər

- **Autentifikasiya Bypass** — Şifrə bilmədən istənilən hesaba, o cümlədən admin hesabına daxil olmaq
- **Məlumat Sızması** — UNION-based injection ilə bütün istifadəçi adları, e-mailləri, hash şifrələri əldə etmək mümkündür
- **Veritabanı Manipulyasiyası** — `INSERT` / `UPDATE` / `DELETE` əmrləri ilə məlumatları dəyişdirmək
- **Tam Məlumat Bazası Silinməsi** — `DROP TABLE` ilə bütün məlumatların məhv edilməsi
- **Kupon Saxtakarlığı** — Cədvəllərdə manipulyasiya ilə istənilən endirim kodlarının əldə edilməsi

### Dolayı Risklər

- **İstifadəçi Məlumatlarının Oğurlanması** — E-mail ünvanları üçüncü tərəfə satıla bilər
- **Şifrə Hash-larının Əldə Edilməsi** — bcrypt hash-ları offline brute-force hücumlarına məruz qalar
- **Admin Panelə Tam Giriş** — `/admin` panel vasitəsilə bütün sistem idarə edilə bilər
- **Platforma Reputasiyasına Zərər** — İstifadəçi etibarının tamamilə itirilməsi
- **Hüquqi Məsuliyyət** — GDPR və digər məlumat qorunması qanunlarının pozulması

---

## 📊 CVSS Qiymətləndirməsi

| Metrika | Dəyər | Bal |
|---|---|---|
| Hücum Vektoru | Network (Şəbəkə) | `AV:N` |
| Mürəkkəblik | Low (Aşağı) | `AC:L` |
| Lazım olan İmtiyazlar | Yoxdur | `PR:N` |
| İstifadəçi Qarşılıqlılığı | Tələb olunmur | `UI:N` |
| Məxfilik Təsiri | Yüksək (Tam) | `C:H` |
| Bütövlük Təsiri | Yüksək (Tam) | `I:H` |
| Əlçatımlılıq Təsiri | Yüksək | `A:H` |
| **CVSS v3.1 CƏMİ BAL** | **9.8 / 10.0 — KRİTİK** | 🔴 |

---

## ✅ Düzəltmə Yolları

### 1. Parametrized Query — Əsas Həll

Ən effektiv və tövsiyə olunan həll **Parameterized Query** istifadəsidir:

```js
// ✅ DÜZGÜN — Parameterized Query
const user = db.prepare(
  'SELECT * FROM users WHERE username = ?'
).get(username);
```

`?` işarəsi SQL sürücüsünə placeholder rolunu oynayır. Sürücü `username` dəyərini SQL kodu kimi deyil, məlumat kimi işləyir. Buna görə `'` işarəsi və digər SQL metacharacter-lar öz xüsusi mənalarını itirirlər.

### 2. Input Validasiya

```js
// Yalnız hərif, rəqəm, alt xətt qəbul et
const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
if (!usernameRegex.test(username)) {
  return res.status(400).json({ error: "Yanlış format" });
}
```

- Uzunluq məhdudiyyəti tətbiq edilsin (maksimum 50 simvol)
- Xüsusi SQL simvolları (`'`, `"`, `;`, `--`) rədd edilsin

### 3. Least Privilege Prinsipi

- Veritabanı istifadəçisi yalnız lazım olan əməliyyatlar üçün icazəyə sahib olmalıdır
- Application user-i üçün `DROP`, `CREATE`, `ALTER` icazələri verilməsin

### 4. Web Application Firewall (WAF)

- SQL injection patternlərini tanıyan WAF qurulsun
- Rate limiting — brute force hücumlarından qorunmaq üçün
- Şübhəli sorğular üçün avtomatik bloklama

### 5. Logging və Monitoring

- Bütün uğursuz giriş cəhdləri loglanmalıdır
- Anomal davranış üçün real-time alert sistemi qurulsun
- SQL error mesajları istifadəçiyə göstərilməsin

---

## 🎯 Hücum Ssenarisi (Simulyasiya)

| # | Hərəkət | Nəticə |
|---|---|---|
| 1 | Brauzer vasitəsilə `/login` səhifəsinə daxil olunur | Login formu yüklənir |
| 2 | `Username: admin'--` daxil edilir, `Password: anything` yazılır | Form server-ə göndərilir |
| 3 | Server SQL sorğusu qurur: `...username = 'admin'--'` | Şifrə yoxlaması şərh olunur |
| 4 | DB admin istifadəçisini tapır və qaytarır | Autentifikasiya bypass olunur |
| 5 | Server admin session-u yaradır | Tam admin giriş əldə edilir |
| 6 | `/admin` panelə yönləndirilir | Bütün idarəetmə funksiyaları əlçatandır |

---

## 📝 Nəticə

SteamCoupons platformasındakı SQL Injection zəifliyi **kritik səviyyədə** qiymətləndirilir. Zəiflik login endpoint-inin giriş validasiyasının olmamasından qaynaqlanır.

| Risk Səviyyəsi | Düzəltmə Müddəti | Həll Mürəkkəbliyi |
|---|---|---|
| 🔴 **KRİTİK** | Dərhal (< 24 saat) | Aşağı (1 sətir kod) |

Zəifliyin düzəldilməsi üçün prioritet olaraq **parametrized query** tətbiq edilməlidir. Bu, sadə bir kod dəyişikliyi olmaqla birlikdə, ən effektiv müdafiə metodudur.

---

*SteamCoupons Təhlükəsizlik Hesabatı — 2025 | Bu sənəd yalnız daxili təhsil məqsədi ilə hazırlanmışdır.*
