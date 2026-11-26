/**
 * Captions from the original language file (ulng.txt), Turkish and English,
 * plus the few texts the mobile version adds (marked "mobile").
 */
export type Lang = 'tr' | 'en';

export const CAPTIONS: Record<string, { tr: string; en: string }> = {
  "mnuLng": {
    "en": "English",
    "tr": "Türkçe"
  },
  "mnuFile": {
    "en": "File",
    "tr": "Dosya"
  },
  "mnuFileNew": {
    "en": "New",
    "tr": "Yeni"
  },
  "mnuFileOpen": {
    "en": "Open",
    "tr": "Aç"
  },
  "mnuFileSave": {
    "en": "Save",
    "tr": "Kaydet"
  },
  "mnuFileSaveAs": {
    "en": "Save As",
    "tr": "Farklı Kaydet"
  },
  "mnuFilePrintPrev": {
    "en": "Print Preview",
    "tr": "Baskı Önizleme"
  },
  "mnuFilePrintSet": {
    "en": "Print Settings",
    "tr": "Yazdırma Ayarları"
  },
  "mnuFileExit": {
    "en": "Exit",
    "tr": "Çıkış"
  },
  "mnuEdit": {
    "en": "Edit",
    "tr": "Düzenle"
  },
  "mnuEditAddText": {
    "en": "Add Description Text",
    "tr": "Açıklama Metni Ekle"
  },
  "mnuEditSelectAll": {
    "en": "Select All",
    "tr": "Hepsını Seç"
  },
  "mnuEditDeselect": {
    "en": "Deselect",
    "tr": "Hiçbirini Seçme"
  },
  "mnuEditDelete": {
    "en": "Delete",
    "tr": "Sil"
  },
  "mnuWindow": {
    "en": "Window",
    "tr": "Pencere"
  },
  "mnuWindowLibrary": {
    "en": "Library",
    "tr": "Kütüphane"
  },
  "mnuWindowLimits": {
    "en": "Show print page limits",
    "tr": "Sayfa sınırlarını göster"
  },
  "mnuHelp": {
    "en": "Help",
    "tr": "Yardım"
  },
  "mnuHelpHelp": {
    "en": "Help",
    "tr": "Yardım"
  },
  "mnuWindowLang": {
    "en": "Language",
    "tr": "Dil"
  },
  "frmMainText": {
    "en": "New",
    "tr": "Yeni"
  },
  "frmLibText": {
    "en": "Library",
    "tr": "Kütüphane"
  },
  "mnuHelpWeb": {
    "en": "Visit web site",
    "tr": "Web Sitesine Git"
  },
  "mnuHelpAbout": {
    "en": "About ESCS",
    "tr": "ESCS Hakkında"
  },
  "libGroupMotor": {
    "en": "Induction Motors",
    "tr": "Asenkron Motorlar"
  },
  "libGroupPower": {
    "en": "AC Power supplies",
    "tr": "Güç kaynakları"
  },
  "libGroupElement": {
    "en": "Components",
    "tr": "Devre elemanları"
  },
  "libGroupSystem": {
    "en": "Systems",
    "tr": "Sistemler"
  },
  "SinirAnahtar2": {
    "en": "Limit switch(two pole)",
    "tr": "sınır anahtarı(iki kutuplu)"
  },
  "Start3x3": {
    "en": "3 pole double state switch",
    "tr": "Üç kutuplu çift konumlu anahtar"
  },
  "Startx3": {
    "en": "3 pole single state switch",
    "tr": "Üç kutuplu tek konumlu anahtar"
  },
  "Lamba": {
    "en": "Lamp",
    "tr": "Lamba"
  },
  "SinirAnahtar": {
    "en": "Limit switch(single pole)",
    "tr": "Sınır anahtarı(Tek kutuplu)"
  },
  "StartStopButon": {
    "en": "Two way button",
    "tr": "Çift yollu buton"
  },
  "StopButon": {
    "en": "Stop Button",
    "tr": "Stop Buton"
  },
  "StartButon": {
    "en": "Start Button",
    "tr": "Start Buton"
  },
  "KapaliKontak": {
    "en": "Normally Closed Contact",
    "tr": "Normalde Kapalı Kontak"
  },
  "AcikKontak": {
    "en": "Normally Open Contact",
    "tr": "Normalde Açık Kontak"
  },
  "UcAcikKontak": {
    "en": "Normally Open Triple Contact",
    "tr": "Normalde Açık Üçlü Kontak"
  },
  "UcKapaliKontak": {
    "en": "Normally Closed Triple Contact",
    "tr": "Normalde Kapalı Üçlü Kontak"
  },
  "TersZamanRolesi": {
    "en": "Off-delay Time Relay",
    "tr": "Ters Zaman Rölesi"
  },
  "ZamanRolesi": {
    "en": "On-delay Time Relay",
    "tr": "Düz Zaman Rölesi"
  },
  "Role": {
    "en": "Contactor",
    "tr": "Kontaktör"
  },
  "BirFazMotor2": {
    "en": "Single Phase Induction Motor with centrifugal switch",
    "tr": "Merkez kaç anahtarlı tek fazlı asenkron motor"
  },
  "UcFazliMotor2": {
    "en": "Star-Delta Connectible 3 Phase Induction Motor",
    "tr": "Yıldız Üçgen Bağlanabılen Üç Fazlı Asenkron Motor"
  },
  "BirFazMotor": {
    "en": "Single Phase Induction Motor",
    "tr": "Tek fazlı asenkron Motor"
  },
  "UcFazliMotor": {
    "en": "Three Phase Induction Motor",
    "tr": "Üç fazlı asenkron motor"
  },
  "UcFazGuc": {
    "en": "3-Phase Supply",
    "tr": "Üç Fazlı Güç Kaynağı"
  },
  "GucN": {
    "en": "Neutral",
    "tr": "Nötr"
  },
  "GucT": {
    "en": "L1",
    "tr": "L1"
  },
  "GucS": {
    "en": "L2",
    "tr": "L2"
  },
  "GucR": {
    "en": "L3",
    "tr": "L3"
  },
  "Kapi1": {
    "en": "Gate system 1",
    "tr": "Kapı Sistemi 1"
  },
  "Kapi2": {
    "en": "Gate system 2",
    "tr": "Kapı Sistemi 2"
  },
  "Asansor": {
    "en": "Elevator",
    "tr": "Asansör"
  },
  "alertSaveChanges": {
    "en": "Do you want to save the changes to",
    "tr": "Yapılan değişiklikleri kaydetmek istiyor musunuz:"
  },
  "alertError1": {
    "en": "This contact have many contactors.",
    "tr": "Bir kontaga birkac eleman baglanmis."
  },
  "alertError2": {
    "en": "This label is used twice. Use different labels.",
    "tr": "Bu isim birden fazla kullanılmış. Karışıklığı önlemek için lütfen farklı isim kullanınız."
  },
  "alertError3": {
    "en": "This contact have no relays.",
    "tr": "Bu elemanin rolesi yok"
  },
  "alertError4": {
    "en": "Only one Relay or Motor must be connected on this connection.",
    "tr": "Bu yolda iki röle veya motor bağlı öalışmaz"
  },
  "alertError5": {
    "en": "This connection have shortcircuit",
    "tr": "Hata: Bu baglantida kisadevre var!"
  },
  "alertError6": {
    "en": "Two phases connected to to each other",
    "tr": "Hata: Bu baglantida kisadevre var!"
  },
  "alertError7": {
    "en": "Motor hasn’t  one phase",
    "tr": "Motora Fazlarin biri gelmiyor."
  },
  "alertError8": {
    "en": "Motor hasn’t two phases",
    "tr": "Motora Fazlarin ikisi gelmiyor."
  },
  "alertError9": {
    "en": "Motor connected not correctly",
    "tr": "Motor yanlis baglanmis."
  },
  "alertError10": {
    "en": "Motor's complementary coil 's not seperated",
    "tr": "Motorun Yardimci sargisi devreden cikartilmadi."
  },
  "alertError11": {
    "en": "This Element have an error",
    "tr": "Bu Elemanda hata var."
  },
  "alertError12": {
    "en": "File read error.",
    "tr": "Dosya okuma hatası."
  },
  "alertMotor1": {
    "en": "Motor burned over!",
    "tr": "Motor yandı!"
  },
  "statusOpening": {
    "en": "Opening",
    "tr": "Dasya açılıyor"
  },
  "statusSaving": {
    "en": "Saving",
    "tr": "Dosya Kaydediliyor"
  },
  "cmRotate": {
    "en": "Rotate",
    "tr": "Döndür"
  },
  "cmColor": {
    "en": "Color",
    "tr": "Renk"
  },
  "cmcRed": {
    "en": "Red",
    "tr": "Kırmızı"
  },
  "cmcBlue": {
    "en": "Blue",
    "tr": "Mavi"
  },
  "cmcGreen": {
    "en": "Green",
    "tr": "Yeşil"
  },
  "cmcMagenta": {
    "en": "Meganta",
    "tr": "Kırmızımsı mor"
  },
  "cmcYellow": {
    "en": "Yellow",
    "tr": "Sarı"
  },
  "tbText": {
    "en": "Write text here",
    "tr": "Metni buraya yazın"
  },
  "cmtEdit": {
    "en": "Edit text",
    "tr": "Metni düzenle"
  },
  "cmtRemove": {
    "en": "Remove description text",
    "tr": "Açıklama metnini kaldır"
  },
  "HelpFile": {
    "en": "EKTS_en.chm",
    "tr": "EKTS_tr.chm"
  },
  "sumElType": {
    "en": "Element",
    "tr": "Eleman tipi"
  },
  "sumQuantity": {
    "en": "Quantity",
    "tr": "Adet"
  },
  "sumLabel": {
    "en": "Label",
    "tr": "Adı"
  },
  "sumNoSummary": {
    "en": "Elements not used",
    "tr": "Devre Eleman Kullanılmadı"
  },
  "stOpening": {
    "en": "Opening File",
    "tr": "Dosya Açılıyor"
  },
  "stIdle": {
    "en": ".",
    "tr": "."
  },
  "mnuWindowSummary": {
    "en": "List used Elements",
    "tr": "Kullanılan Elemanları Listele"
  },
  "tbBtnNew": {
    "en": "New",
    "tr": "Yeni"
  },
  "tbBtnOpen": {
    "en": "Open",
    "tr": "Aç"
  },
  "tbBtnSave": {
    "en": "Save",
    "tr": "Kaydet"
  },
  "tbBtnDelete": {
    "en": "Delete",
    "tr": "Sil"
  },
  "tbBtnPrint": {
    "en": "Print",
    "tr": "Yazıcıdan çıktı al"
  },
  "tbBtnLibrary": {
    "en": "Library",
    "tr": "Kütüphane"
  },
  "tbBtnSum": {
    "en": "List of used Elements",
    "tr": "Kullanılan Elemanları Listesi"
  },
  "tbBtnRun": {
    "en": "Run",
    "tr": "Çalıştır"
  },
  "alertMessage": {
    "en": "Showing print page limits may couse circuit layout delays. It is recommended to hide print page limits when not used.",
    "tr": "Sayfa sınırlarını göstermek çizilen devrenin gosterimini yavaşlatmaktadır. Sayfa sınırlarının ihtiyaç duyulmadıgı zamanlar saklanması önerilmektedir."
  }
};

/** Texts the desktop program did not need. */
export const MOBILE: Record<string, { tr: string; en: string }> = {
  undo: { tr: 'Geri Al', en: 'Undo' },
  redo: { tr: 'Yinele', en: 'Redo' },
  examples: { tr: 'Örnek Devreler', en: 'Example Circuits' },
  fit: { tr: 'Ekrana Sığdır', en: 'Fit to Screen' },
  rename: { tr: 'İsim ver…', en: 'Name…' },
  delay: { tr: 'Süre (saniye)…', en: 'Delay (seconds)…' },
  add: { tr: 'Ekle', en: 'Add' },
  ok: { tr: 'Tamam', en: 'OK' },
  cancel: { tr: 'İptal', en: 'Cancel' },
  yes: { tr: 'Evet', en: 'Yes' },
  no: { tr: 'Hayır', en: 'No' },
  close: { tr: 'Kapat', en: 'Close' },
  stop: { tr: 'Durdur', en: 'Stop' },
  running: { tr: 'Devre çalışıyor', en: 'Circuit running' },
  newFile: { tr: 'Yeni', en: 'New' },
  name: { tr: 'Adı', en: 'Label' },
  relayPick: { tr: 'Kontağın ait olduğu röle', en: 'Relay of this contact' },
  noRelays: { tr: 'Devrede kontaktör veya zaman rölesi yok.', en: 'There is no contactor or time relay in the circuit.' },
  saveImage: { tr: 'Resim Olarak Kaydet', en: 'Save as Image' },
  holdHint: {
    tr: 'Düğmeyi basılı bırakmak için parmağınızı yarım saniye tutun (bilgisayardaki sağ tık).',
    en: 'Hold for half a second to latch a button (right click on the desktop).',
  },
};

export function caption(key: string, lang: Lang): string {
  return CAPTIONS[key]?.[lang] ?? MOBILE[key]?.[lang] ?? key;
}
