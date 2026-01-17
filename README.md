---
Test PR
---

# ARTEK Homepage

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet%204-8B5CF6)](https://www.anthropic.com/claude)

***ARTEK Homepage***, *React* ve *Carbon Design System* ile oluşturulmuş, çoklu dil desteğine sahip modern kurumsal web sitesi projesidir.

🌐 **Canlı Site:** [www.artek.tc](https://www.artek.tc)

---

## 🏗️ Mimari

Tüm sistem üretim (production) ortamında tamamen `Cloudflare Pages` ve `Workers` üzerinde çalışır.

### Üç Katmanlı Mimari

`ARTEK Homepage` proje mimarisini bütünsel olarak üç ana konsept ile açıklamak mümkündür:

- **React Frontend** son kullanıcı ile etkileşim katmanıdır ve kullanıcı arayüzünü yönetir.
- **Workers** katmanı sistemin backend servisleri olan *AI Worker* ve *Mail Worker* yapılarından oluşur.
- **Scripts & Tools** ise geliştirme ve üretim süreçlerini destekleyen araçlardan oluşur.

```mermaid
  graph LR
    Homepage[ARTEK Homepage]

    Homepage --> Frontend[React Frontend]
    Homepage --> Workers[Workers]
    Homepage --> Scripts[Scripts & Tools]

    Workers --> AIWorker[AI Worker]
    Workers --> MailWorker[Mail Worker]
```

### Veri Akışı & Entegrasyonlar

```mermaid
flowchart TB
    User["User"] -- Request --> CFPages["Cloudflare Pages <br> _worker.js"]
    CFPages -- Serve Static Build --> Frontend["React Frontend"]
    Frontend -- Chat Request --> AIWorker["AI Worker"]
    Frontend -- Contact Form --> MailWorker["Mail Worker"]
    AIWorker -- Prompt + Context --> Claude["Claude Sonnet 4"]
    Claude -- knowledge_search Tool --> AutoRAG["Cloudflare AI Search<br>AutoRAG"]
    AutoRAG -- Retrieved Context --> Claude
    AIWorker -- Store Conversation --> D1[("D1 Database")]
    AIWorker -- Rate Limiting --> KV[("KV Storage")]
    MailWorker -- Send Email --> Resend["Resend API"]
    Claude -- AI Response --> AIWorker
    AIWorker -- Chat Response --> Frontend
    Frontend -- Update UI --> CFPages
    CFPages -- Response --> User

    style CFPages fill:#F38020,stroke:#333,stroke-width:2px,color:#000000
    style Frontend fill:#BBDEFB,stroke:#333,stroke-width:2px,color:#000000
    style AIWorker fill:#F38020,stroke:#333,stroke-width:2px,color:#000000
    style MailWorker fill:#F38020,stroke:#333,stroke-width:2px,color:#000000
    style Claude fill:#8B5CF6,stroke:#333,stroke-width:2px,color:#000000
```

---

## 📁 Proje Yapısı

```
artek-homepage/
├── src/                      
│   ├── pages/               
│   ├── shared/              
│   │   ├── components/     
│   │   ├── hooks/          
│   │   ├── styles/         
│   │   └── translations/   
│   └── router/              
├── workers/                  
│   ├── ai-worker/           
│   │   ├── src/            
│   │   ├── migrations/     
│   │   └── wrangler.jsonc  
│   └── mail-worker/         
│       ├── src/            
│       └── wrangler.jsonc  
├── scripts/                  
│   ├── utils/               
│   └── dashboard/           
├── public/                   
│   └── data/               
└── dist/                     
```

---

## 🎖️ Teşekkürler

Bu proje, aşağıdaki harika açık kaynak projeler olmadan mümkün olamazdı:

- **[React](https://react.dev/)**
- **[React Router](https://reactrouter.com/)**
- **[Carbon Design System](https://carbondesignsystem.com/)**
- **[Cloudflare Workers](https://workers.cloudflare.com/)**
- **[Claude AI](https://www.anthropic.com/claude)**
- **[Vite](https://vite.dev/)**
- **[TypeScript](https://www.typescriptlang.org/)**
- **[Vitest](https://vitest.dev/)**
- **[Playwright](https://playwright.dev/)**
- **[Ethers.js](https://docs.ethers.org/)**

---

## 🤝 Neden Açık Kaynak?

Bilgiyi gizleyen tüketir, paylaşan çoğaltır. Tarih boyunca insanlığın en büyük sıçramaları,
fikirlerin özgürce dolaşabildiği anlarda gerçekleşti. Açık kaynak, bu kadim gerçeğin modern ifadesidir.

Bir fikir, yayıldıkça güçlenir. Eleştirildikçe olgunlaşır. Üzerine eklendikçe büyür.
Bu proje, yalnızca bugün değil yarın da açık kalması için paylaşma cesareti gösteren
([daima açık](LICENSE)) herkesin ortak eseri olmayı hedefliyor.

### AGPL-3.0 Lisansı & Etik Yükümlülük

Bu proje **AGPL-3.0** lisansı altında yayınlanmıştır. Bu, projeyi fork eden veya kendi projelerinde kullanan herkesin de kaynak kodlarını açık tutma **etik yükümlülüğü** altında olduğu anlamına gelir. Network üzerinden servis sağlayan uygulamalar için GPL'in en güçlü versiyonu olan AGPL, açık kaynak felsefesinin devamını garanti altına alır.

**Katkı politikamız için:**
[CONTRIBUTING.md](CONTRIBUTING.md) dosyasına göz atabilirsiniz. (Not: Bu repository harici katkı kabul etmemektedir.)

**Detaylı lisans bilgileri için:**
[LICENSE](LICENSE) dosyasını inceleyebilirsiniz.

---

## 📧 İletişim

**ARTEK İnovasyon Ar-Ge Sanayi ve Tic. Ltd. Şti.**

- 🌐 Web Sitesi: [www.artek.tc](https://www.artek.tc)
- 📧 Genel Sorularınız için: info@artek.tc

**Geliştirici İletişim Bilgileri:**
- 👤 Rıza Emre ARAS
- 📧 r.emrearas@proton.me

---

> *"Dünyada her şey için, medeniyet için, hayat için, muvaffakiyet için en hakiki mürşit ilimdir, fendir.*
> *İlim ve fennin haricinde mürşit aramak gaflettir, cehalettir, dalalettir."*
>
> — **Mustafa Kemal Atatürk**, 22 Eylül 1924, Samsun, İstiklal Ticaret Mektebi Öğretmenlerine Hitaben Yaptığı Konuşma
>
> <sub>[Atatürk'ün Söylev ve Demeçleri, Cilt II, s.349, ATAM Yayınları](http://atam.gov.tr/wp-content/uploads/2024/03/Ataturkun-Soylev-ve-Demecleri-C2.pdf)</sub>

---

<!--suppress HtmlDeprecatedAttribute -->
<div align="center">

![ARTEK Logo](assets/logo-tr-dark.png#gh-light-mode-only)
![ARTEK Logo](assets/logo-tr-light.png#gh-dark-mode-only)

</div>

---

<div align="center">

 **© 2025 Artek İnovasyon Arge Sanayi ve Ticaret Limited Şirketi, Tüm hakları saklıdır.**

</div>
