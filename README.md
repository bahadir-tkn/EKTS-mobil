# EKTS Mobil

Elektrik Kumanda Teknikleri Simülatörü (EKTS) programının mobil sürümü. Telefona
uygulama gibi kurulabilen bir web uygulamasıdır (PWA) ve internet olmadan da çalışır.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # simülasyon testleri
npm run lint     # tip kontrolü
npm run build    # dist/ klasörüne üretim derlemesi
```

## Yayın

`main` dalına yapılan her push, GitHub Actions ile derlenip GitHub Pages'e yayınlanır
(`.github/workflows/deploy.yml`). Depo ayarlarında **Settings → Pages → Source** değeri
**GitHub Actions** olmalıdır.

Uygulama adresi: https://bahadir-tkn.github.io/EKTS-mobil/

## Telefona kurma

- **Android (Chrome):** adresi açın, menüden **Ana ekrana ekle / Uygulamayı yükle**.
- **iPhone (Safari):** adresi açın, **Paylaş → Ana Ekrana Ekle**.
