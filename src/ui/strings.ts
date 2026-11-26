/**
 * Captions from the original language file (ulng.txt) in all six of its
 * languages, in its column order (the Dil menu lists them in this order),
 * plus the few texts the mobile version adds (MOBILE, Turkish and English;
 * other languages show the English).
 */
export const LANGS = ['en', 'tr', 'bg', 'fa', 'ar', 'nl'] as const;
export type Lang = (typeof LANGS)[number];

export const CAPTIONS: Record<string, Record<Lang, string>> = {
  "mnuLng": {
    "en": "English",
    "tr": "Türkçe",
    "bg": "Български",
    "fa": "farsi",
    "ar": "Arabic",
    "nl": "Nederlands"
  },
  "mnuFile": {
    "en": "File",
    "tr": "Dosya",
    "bg": "Файл",
    "fa": "فایل",
    "ar": "ملف",
    "nl": "Bestand"
  },
  "mnuFileNew": {
    "en": "New",
    "tr": "Yeni",
    "bg": "Нов",
    "fa": "جدید",
    "ar": "جديد",
    "nl": "Nieuw"
  },
  "mnuFileOpen": {
    "en": "Open",
    "tr": "Aç",
    "bg": "Отвори",
    "fa": "باز کردن",
    "ar": "فتح",
    "nl": "Openen"
  },
  "mnuFileSave": {
    "en": "Save",
    "tr": "Kaydet",
    "bg": "Запиши",
    "fa": "ذخیره",
    "ar": "حفظ",
    "nl": "Opslaan"
  },
  "mnuFileSaveAs": {
    "en": "Save As",
    "tr": "Farklı Kaydet",
    "bg": "Запиши като",
    "fa": "ذخیره در",
    "ar": "حفـظ باسم",
    "nl": "Opslaan als"
  },
  "mnuFilePrintPrev": {
    "en": "Print Preview",
    "tr": "Baskı Önizleme",
    "bg": "Визуализация печат",
    "fa": "پیش نمایش چاپ",
    "ar": "معاينة قبل الطباعة",
    "nl": "Afdrukvoorbeeld"
  },
  "mnuFilePrintSet": {
    "en": "Print Settings",
    "tr": "Yazdırma Ayarları",
    "bg": "Настройка принтер",
    "fa": "تنظیمات چاپ",
    "ar": "اعدادات الطباعة",
    "nl": "Afdrukinstellingen"
  },
  "mnuFileExit": {
    "en": "Exit",
    "tr": "Çıkış",
    "bg": "Изход",
    "fa": "خروج",
    "ar": "خـروج",
    "nl": "Afsluiten"
  },
  "mnuEdit": {
    "en": "Edit",
    "tr": "Düzenle",
    "bg": "Редактиране",
    "fa": "ویرایش",
    "ar": "تحـرير",
    "nl": "Bewerken"
  },
  "mnuEditAddText": {
    "en": "Add Description Text",
    "tr": "Açıklama Metni Ekle",
    "bg": "Добавяне на описание",
    "fa": "اضافه کردن نوشتار",
    "ar": "اضافة نص وصفـى",
    "nl": "Voeg Beschrijving toe"
  },
  "mnuEditSelectAll": {
    "en": "Select All",
    "tr": "Hepsını Seç",
    "bg": "Избери всичко",
    "fa": "انتخاب همه",
    "ar": "تحديد الكل",
    "nl": "Alles selecteren"
  },
  "mnuEditDeselect": {
    "en": "Deselect",
    "tr": "Hiçbirini Seçme",
    "bg": "Отмени избора",
    "fa": "عدم انتخاب",
    "ar": "إلغاء التحديد",
    "nl": "Deselecteren"
  },
  "mnuEditDelete": {
    "en": "Delete",
    "tr": "Sil",
    "bg": "Изтриване",
    "fa": "حذف",
    "ar": "حـذف",
    "nl": "Verwijderen"
  },
  "mnuWindow": {
    "en": "Window",
    "tr": "Pencere",
    "bg": "Прозорец",
    "fa": "پنجره ها",
    "ar": "نـافذة",
    "nl": "Venster"
  },
  "mnuWindowLibrary": {
    "en": "Library",
    "tr": "Kütüphane",
    "bg": "Библиотека",
    "fa": "کتابخانه",
    "ar": "مكتبـة",
    "nl": "Bibliotheek"
  },
  "mnuWindowLimits": {
    "en": "Show print page limits",
    "tr": "Sayfa sınırlarını göster",
    "bg": "Покажи страница",
    "fa": "خط مرز قابل چاپ",
    "ar": "اظهار حدود الطباعة",
    "nl": "Toon print pagina grenzen"
  },
  "mnuHelp": {
    "en": "Help",
    "tr": "Yardım",
    "bg": "Помощ",
    "fa": "راهنما",
    "ar": "مساعدة",
    "nl": "Help"
  },
  "mnuHelpHelp": {
    "en": "Help",
    "tr": "Yardım",
    "bg": "Помощ",
    "fa": "راهنما",
    "ar": "مساعدة",
    "nl": "Help"
  },
  "mnuWindowLang": {
    "en": "Language",
    "tr": "Dil",
    "bg": "Език",
    "fa": "زبان",
    "ar": "اللغة",
    "nl": "Taal"
  },
  "frmMainText": {
    "en": "New",
    "tr": "Yeni",
    "bg": "Нов",
    "fa": "جدید",
    "ar": "جديد",
    "nl": "Nieuw"
  },
  "frmLibText": {
    "en": "Library",
    "tr": "Kütüphane",
    "bg": "Библиотека",
    "fa": "کتابخانه",
    "ar": "مكتبة",
    "nl": "Bibliotheek"
  },
  "mnuHelpWeb": {
    "en": "Visit web site",
    "tr": "Web Sitesine Git",
    "bg": "Посети web site",
    "fa": "مشاهده وب سایت",
    "ar": "زيارة موقعنا",
    "nl": "Bezoek website"
  },
  "mnuHelpAbout": {
    "en": "About ESCS",
    "tr": "ESCS Hakkında",
    "bg": "За ESCS",
    "fa": "معرفی نرم افزار",
    "ar": "حـول البرنامج",
    "nl": "Over EGKS"
  },
  "libGroupMotor": {
    "en": "Induction Motors",
    "tr": "Asenkron Motorlar",
    "bg": "Ел.двигатели",
    "fa": "موتور های القایی",
    "ar": "مواتير الحث",
    "nl": "Inductiemotoren"
  },
  "libGroupPower": {
    "en": "AC Power supplies",
    "tr": "Güç kaynakları",
    "bg": "Захранване",
    "fa": "منبع تغذیه متناوب",
    "ar": "إمدادات الطاقة المترددة",
    "nl": "Netvoedingen"
  },
  "libGroupElement": {
    "en": "Components",
    "tr": "Devre elemanları",
    "bg": "Елементи",
    "fa": "مولفه ها",
    "ar": "المكونات",
    "nl": "Componenten"
  },
  "libGroupSystem": {
    "en": "Systems",
    "tr": "Sistemler",
    "bg": "Системи",
    "fa": "سیستم ها",
    "ar": "أنظمة",
    "nl": "Systemen"
  },
  "SinirAnahtar2": {
    "en": "Limit switch(two pole)",
    "tr": "sınır anahtarı(iki kutuplu)",
    "bg": "Превключвател двупозиционен",
    "fa": "میکروسویچ (دوکنتاکته)",
    "ar": "مفتاح التحويل(ثنائى القطب)",
    "nl": "Eindschakelaar (twee polig)"
  },
  "Start3x3": {
    "en": "3 pole double state switch",
    "tr": "Üç kutuplu çift konumlu anahtar",
    "bg": "Триполюсен 2 поз.превключвател",
    "fa": "کلید سه پل دو کنتاکته",
    "ar": "مفتاح الحالة المزدوج (ثلاثى القطبية)",
    "nl": "3-polige dubbele schakelaar"
  },
  "Startx3": {
    "en": "3 pole single state switch",
    "tr": "Üç kutuplu tek konumlu anahtar",
    "bg": "Триполюсен еднопоз.превключвател",
    "fa": "کلید سه پل تک کنتاکت",
    "ar": "مفتاح الحالة الفردى (ثلاثى القطبية)",
    "nl": "3-polige enkele schakelaar"
  },
  "Lamba": {
    "en": "Lamp",
    "tr": "Lamba",
    "bg": "Лампа",
    "fa": "لامپ",
    "ar": "مصباح",
    "nl": "Lamp"
  },
  "SinirAnahtar": {
    "en": "Limit switch(single pole)",
    "tr": "Sınır anahtarı(Tek kutuplu)",
    "bg": "Ключ",
    "fa": "میکرو سویچ تک کنتاکت",
    "ar": "مفتاح التحول(قطب واحد)",
    "nl": "Eindschakelaar (enkelpolig)"
  },
  "StartStopButon": {
    "en": "Two way button",
    "tr": "Çift yollu buton",
    "bg": "Старт/стоп бутон",
    "fa": "کلید دو کنتاکت (بسته و باز)",
    "ar": "المفتاح ذو الاتجاهين",
    "nl": "Twee-weg knop"
  },
  "StopButon": {
    "en": "Stop Button",
    "tr": "Stop Buton",
    "bg": "Стоп бутон",
    "fa": "کلید استوپ",
    "ar": "مفتاح التوقف",
    "nl": "Stopknop"
  },
  "StartButon": {
    "en": "Start Button",
    "tr": "Start Buton",
    "bg": "Старт бутон",
    "fa": "کلید استارت",
    "ar": "مفتاح البدء",
    "nl": "Startknop"
  },
  "KapaliKontak": {
    "en": "Normally Closed Contact",
    "tr": "Normalde Kapalı Kontak",
    "bg": "Норм.затворен контакт",
    "fa": "تیغه بسته",
    "ar": "سكينة الاتصال المغلقة",
    "nl": "Normaal gesloten contact"
  },
  "AcikKontak": {
    "en": "Normally Open Contact",
    "tr": "Normalde Açık Kontak",
    "bg": "Норм.отворен контакт",
    "fa": "تیغه باز",
    "ar": "سكينة الاتصال المفتوحة",
    "nl": "Normaal open contact"
  },
  "UcAcikKontak": {
    "en": "Normally Open Triple Contact",
    "tr": "Normalde Açık Üçlü Kontak",
    "bg": "Норм.отв.троен контакт",
    "fa": "سه تیغه باز همزمان",
    "ar": "سكينة الاتصال الثلاثية المفتوحة",
    "nl": "Normaal open drievoudig contact"
  },
  "UcKapaliKontak": {
    "en": "Normally Closed Triple Contact",
    "tr": "Normalde Kapalı Üçlü Kontak",
    "bg": "Норм.затв.троен контакт",
    "fa": "سه تیغه بسته همزمان",
    "ar": "سكينة الاتصال الثلاثية المغلقة",
    "nl": "Normaal gesloten drievoudig contact"
  },
  "TersZamanRolesi": {
    "en": "Off-delay Time Relay",
    "tr": "Ters Zaman Rölesi",
    "bg": "Обратно реле време",
    "fa": "تایمر تاخیر در قطع",
    "ar": "المؤقت المـتأخر",
    "nl": "Uit- vertraging tijdrelais"
  },
  "ZamanRolesi": {
    "en": "On-delay Time Relay",
    "tr": "Düz Zaman Rölesi",
    "bg": "Реле време",
    "fa": "تایمر تاخیر در وصل",
    "ar": "المؤقت المتقدم",
    "nl": "Aan- vertraging tijdrelais"
  },
  "Role": {
    "en": "Contactor",
    "tr": "Kontaktör",
    "bg": "Контактор",
    "fa": "کنتاکتور",
    "ar": "ملفات الحث",
    "nl": "Relais"
  },
  "BirFazMotor2": {
    "en": "Single Phase Induction Motor with centrifugal switch",
    "tr": "Merkez kaç anahtarlı tek fazlı asenkron motor",
    "bg": "Монофазен двигател с авт.ключ",
    "fa": "موتور القایی تکفاز با کلید گریز از مرکز",
    "ar": "موتور الحث ذات المصدر الواحد",
    "nl": "Een fase inductiemotor met centrifugaal schakelaar"
  },
  "UcFazliMotor2": {
    "en": "Star-Delta Connectible 3 Phase Induction Motor",
    "tr": "Yıldız Üçgen Bağlanabılen Üç Fazlı Asenkron Motor",
    "bg": "Трифазен двиг.звезда-триъгълник",
    "fa": "موتور سه فاز القایی با قابلیت ستاره مثلث",
    "ar": "موتور الحث ذات المصدر الواحد بمفتاح الطرد المركزى",
    "nl": "Ster-driehoek schakelaar 3 fase inductiemotor"
  },
  "BirFazMotor": {
    "en": "Single Phase Induction Motor",
    "tr": "Tek fazlı asenkron Motor",
    "bg": "Монофазен двигател",
    "fa": "موتور القایی تکفاز با کلید گریز از مرکز",
    "ar": "موتور الحث واحد فيز",
    "nl": "Een fase inductiemotor"
  },
  "UcFazliMotor": {
    "en": "Three Phase Induction Motor",
    "tr": "Üç fazlı asenkron motor",
    "bg": "Трифазен двигател",
    "fa": "موتور القایی سه فاز",
    "ar": "موتور الحث ثلاثة فيزات",
    "nl": "Drie fase inductiemotor"
  },
  "UcFazGuc": {
    "en": "3-Phase Supply",
    "tr": "Üç Fazlı Güç Kaynağı",
    "bg": "Трифазно захранване",
    "fa": "منبع تغذیه سه فاز",
    "ar": "مزود طاقة ثلاثـى",
    "nl": "3- fase voeding"
  },
  "GucN": {
    "en": "Neutral",
    "tr": "Nötr",
    "bg": "Нула",
    "fa": "نول",
    "ar": "نقطة التعادل",
    "nl": "Neutraal"
  },
  "GucT": {
    "en": "L1",
    "tr": "L1",
    "bg": "T фаза",
    "fa": "فاز L1",
    "ar": "فيز 1",
    "nl": "T fase"
  },
  "GucS": {
    "en": "L2",
    "tr": "L2",
    "bg": "S фаза",
    "fa": "فاز L2",
    "ar": "فيز 2",
    "nl": "S fase"
  },
  "GucR": {
    "en": "L3",
    "tr": "L3",
    "bg": "R фаза",
    "fa": "فاز L3",
    "ar": "فيز 3",
    "nl": "R fase"
  },
  "Kapi1": {
    "en": "Gate system 1",
    "tr": "Kapı Sistemi 1",
    "bg": "Система за врата 1",
    "fa": "سیستم گیت 1",
    "ar": "نظام بوابة 1",
    "nl": "Poort systeem 1"
  },
  "Kapi2": {
    "en": "Gate system 2",
    "tr": "Kapı Sistemi 2",
    "bg": "Система за врата 2",
    "fa": "سیستم گیت 2",
    "ar": "نظام بوابة 2",
    "nl": "Poort systeem 2"
  },
  "Asansor": {
    "en": "Elevator",
    "tr": "Asansör",
    "bg": "Асансьор",
    "fa": "آسانسور",
    "ar": "مصعد كهربائى",
    "nl": "Lift"
  },
  "alertSaveChanges": {
    "en": "Do you want to save the changes to",
    "tr": "Yapılan değişiklikleri kaydetmek istiyor musunuz:",
    "bg": "Запиши:",
    "fa": "آیا می خواهید تغییرات را ذخیره کنید در",
    "ar": "هل تريد حفظ التغيرات الـى",
    "nl": "Wilt u de wijzigingen op slaan"
  },
  "alertError1": {
    "en": "This contact have many contactors.",
    "tr": "Bir kontaga birkac eleman baglanmis.",
    "bg": "Този контакт има много контактори",
    "fa": "از تیغه های این کنتاکتور زیاد استفاده شده است",
    "ar": "هذا الملف له العديد من السكاكين",
    "nl": "Dit contact heeft vele schakelaars."
  },
  "alertError2": {
    "en": "This label is used twice. Use different labels.",
    "tr": "Bu isim birden fazla kullanılmış. Karışıklığı önlemek için lütfen farklı isim kullanınız.",
    "bg": "Този етикет са използва 2 пъти",
    "fa": "این نام قبلا استفاده شده است از نام دیگری استفاده کنید",
    "ar": "هذا المسمى مستخدم من قبل اختر مسمى اخر",
    "nl": "Dit label wordt tweemaal gebruikt. Gebruik verschillende labels."
  },
  "alertError3": {
    "en": "This contact have no relays.",
    "tr": "Bu elemanin rolesi yok",
    "bg": "Този контакт няма реле",
    "fa": "این تیغه وصل نشده است",
    "ar": "هذا الاتصال ليس لديهم التبديلات.",
    "nl": "Dit contact heeft geen relais."
  },
  "alertError4": {
    "en": "Only one Relay or Motor must be connected on this connection.",
    "tr": "Bu yolda iki röle veya motor bağlı öalışmaz",
    "bg": "Само едно реле или двигател могат да се свържат на тази връзка",
    "fa": "فقط یک موتور می توان به این کانکشن متصل نمود",
    "ar": "فقط موتور واحد أو مفتاح واحد هو الذى يمكنه الاتصال",
    "nl": "Slechts een relais of motor moet worden aangesloten op de verbinding."
  },
  "alertError5": {
    "en": "This connection have shortcircuit",
    "tr": "Hata: Bu baglantida kisadevre var!",
    "bg": "Връзката има КЪСО",
    "fa": "این قسمت اتصال کوتاه شده است",
    "ar": "هذا الاتصال احدث ماس كهربائى",
    "nl": "Deze verbinding heeft kortsluiting"
  },
  "alertError6": {
    "en": "Two phases connected to to each other",
    "tr": "Hata: Bu baglantida kisadevre var!",
    "bg": "Две фази на късо",
    "fa": "دو فاز به هم بر خورد کرده اند.",
    "ar": "فيزتان متصلتان ببعضهما",
    "nl": "Twee fasen verbonden met elkaar"
  },
  "alertError7": {
    "en": "Motor hasn’t  one phase",
    "tr": "Motora Fazlarin biri gelmiyor.",
    "bg": "Двигателя няма една фаза",
    "fa": "این موتور تک فاز نمی باشد",
    "ar": "الموتور ليس لديه غير فيزا واحدة",
    "nl": "Motor geen een fase"
  },
  "alertError8": {
    "en": "Motor hasn’t two phases",
    "tr": "Motora Fazlarin ikisi gelmiyor.",
    "bg": "Двигателя няма 2 фази",
    "fa": "این موتور دو فاز نمی باشد",
    "ar": "الموتور ليس لديه غير فيزتان",
    "nl": "Motor geen twee fasen"
  },
  "alertError9": {
    "en": "Motor connected not correctly",
    "tr": "Motor yanlis baglanmis.",
    "bg": "Двигателя е свързан неправилно",
    "fa": "موتور اشتباه متصل شده است",
    "ar": "الموتور غير متصل بشكل جيد",
    "nl": "Motor niet correct aangesloten"
  },
  "alertError10": {
    "en": "Motor's complementary coil 's not seperated",
    "tr": "Motorun Yardimci sargisi devreden cikartilmadi.",
    "bg": "Доп.навивка на двиг.не е свързана",
    "fa": "دو سیم پیچ از هم جدا نشده اند",
    "ar": "الملفات التكميلية للموتر غير منفصلة عن بعضها",
    "nl": "Complementaire motorspoel niet gescheiden"
  },
  "alertError11": {
    "en": "This Element have an error",
    "tr": "Bu Elemanda hata var.",
    "bg": "Елемента има грешка",
    "fa": "این المان مشکل دارد",
    "ar": "هذا العنصر يوجد به مشكلة",
    "nl": "Dit element heeft een fout"
  },
  "alertError12": {
    "en": "File read error.",
    "tr": "Dosya okuma hatası.",
    "bg": "Грешка при четене на файла",
    "fa": "مشکل در خواندن فایل",
    "ar": "خـطأ فى قراءة الملف",
    "nl": "Bestand leesfout."
  },
  "alertMotor1": {
    "en": "Motor burned over!",
    "tr": "Motor yandı!",
    "bg": "Двигателя изгоря !",
    "fa": "موتور خواهد سوخت",
    "ar": "الموتور احترق",
    "nl": "Motor doorgebrand!"
  },
  "statusOpening": {
    "en": "Opening",
    "tr": "Dasya açılıyor",
    "bg": "Отваряне",
    "fa": "باز کردن",
    "ar": "فتح",
    "nl": "Openen"
  },
  "statusSaving": {
    "en": "Saving",
    "tr": "Dosya Kaydediliyor",
    "bg": "Запис",
    "fa": "ذخیره",
    "ar": "حفظ",
    "nl": "Opslaan"
  },
  "cmRotate": {
    "en": "Rotate",
    "tr": "Döndür",
    "bg": "Ротация",
    "fa": "چر خاندن",
    "ar": "دوران",
    "nl": "Draaien"
  },
  "cmColor": {
    "en": "Color",
    "tr": "Renk",
    "bg": "Цвят",
    "fa": "رنگ",
    "ar": "اللون",
    "nl": "Kleur"
  },
  "cmcRed": {
    "en": "Red",
    "tr": "Kırmızı",
    "bg": "Червен",
    "fa": "قرمز",
    "ar": "أحمر",
    "nl": "Rood"
  },
  "cmcBlue": {
    "en": "Blue",
    "tr": "Mavi",
    "bg": "Син",
    "fa": "آبی",
    "ar": "أزرق",
    "nl": "Blauw"
  },
  "cmcGreen": {
    "en": "Green",
    "tr": "Yeşil",
    "bg": "Зелен",
    "fa": "سبز",
    "ar": "أخضر",
    "nl": "Groen"
  },
  "cmcMagenta": {
    "en": "Meganta",
    "tr": "Kırmızımsı mor",
    "bg": "Магента",
    "fa": "بنفش",
    "ar": "بنفسجى",
    "nl": "Magenta"
  },
  "cmcYellow": {
    "en": "Yellow",
    "tr": "Sarı",
    "bg": "Жълт",
    "fa": "زرد",
    "ar": "أصفر",
    "nl": "Geel"
  },
  "tbText": {
    "en": "Write text here",
    "tr": "Metni buraya yazın",
    "bg": "Напиши текст тук",
    "fa": "نوشتن متن",
    "ar": "إكتب النص هنا",
    "nl": "Schrijf hier de tekst"
  },
  "cmtEdit": {
    "en": "Edit text",
    "tr": "Metni düzenle",
    "bg": "Редактирай текст",
    "fa": "ویرایش متن",
    "ar": "تعديل النـص",
    "nl": "Tekst bewerken"
  },
  "cmtRemove": {
    "en": "Remove description text",
    "tr": "Açıklama metnini kaldır",
    "bg": "Изтрий описанието",
    "fa": "حذف متن توضیحی",
    "ar": "إزالة النص التوضيحى",
    "nl": "Verwijder beschrijvende tekst"
  },
  "HelpFile": {
    "en": "EKTS_en.chm",
    "tr": "EKTS_tr.chm",
    "bg": "EKTS_en.chm",
    "fa": "EKTS_en.chm",
    "ar": "EKTS_en.chm",
    "nl": "EKTS_en.chm"
  },
  "sumElType": {
    "en": "Element",
    "tr": "Eleman tipi",
    "bg": "Елемент",
    "fa": "المان",
    "ar": "عنصـر",
    "nl": "Element"
  },
  "sumQuantity": {
    "en": "Quantity",
    "tr": "Adet",
    "bg": "Количество",
    "fa": "تعداد",
    "ar": "الكمية",
    "nl": "Kwantiteit"
  },
  "sumLabel": {
    "en": "Label",
    "tr": "Adı",
    "bg": "Етикет",
    "fa": "نام",
    "ar": "الملصق",
    "nl": "Label"
  },
  "sumNoSummary": {
    "en": "Elements not used",
    "tr": "Devre Eleman Kullanılmadı",
    "bg": "Неизползван елемент",
    "fa": "هیچ المانی  استفاده نشده",
    "ar": "عناصر غير مستخدمة",
    "nl": "Elementen niet gebruikt"
  },
  "stOpening": {
    "en": "Opening File",
    "tr": "Dosya Açılıyor",
    "bg": "Отвоти файл",
    "fa": "باز کردن فایل",
    "ar": "ملفات مفتوحة",
    "nl": "Openen van bestanden"
  },
  "stIdle": {
    "en": ".",
    "tr": ".",
    "bg": ".",
    "fa": "",
    "ar": ".",
    "nl": "."
  },
  "mnuWindowSummary": {
    "en": "List used Elements",
    "tr": "Kullanılan Elemanları Listele",
    "bg": "Списък с използваните елементи",
    "fa": "لیبست المان های استفاده شده",
    "ar": "قائمة العناصر المستخدمة",
    "nl": "Lijst gebruikte elementen"
  },
  "tbBtnNew": {
    "en": "New",
    "tr": "Yeni",
    "bg": "Нов",
    "fa": "جدید",
    "ar": "جديد",
    "nl": "Nieuw"
  },
  "tbBtnOpen": {
    "en": "Open",
    "tr": "Aç",
    "bg": "Отвори",
    "fa": "باز کردن",
    "ar": "فتح",
    "nl": "Openen"
  },
  "tbBtnSave": {
    "en": "Save",
    "tr": "Kaydet",
    "bg": "Запази",
    "fa": "ذخیره",
    "ar": "حفظ",
    "nl": "Opslaan"
  },
  "tbBtnDelete": {
    "en": "Delete",
    "tr": "Sil",
    "bg": "Изтрий",
    "fa": "حذف",
    "ar": "حذف",
    "nl": "Verwijderen"
  },
  "tbBtnPrint": {
    "en": "Print",
    "tr": "Yazıcıdan çıktı al",
    "bg": "Печат",
    "fa": "چاپ",
    "ar": "طباعة",
    "nl": "Afdrukken"
  },
  "tbBtnLibrary": {
    "en": "Library",
    "tr": "Kütüphane",
    "bg": "Библиотека",
    "fa": "کتابخانه",
    "ar": "المكتبة",
    "nl": "Bibliotheek"
  },
  "tbBtnSum": {
    "en": "List of used Elements",
    "tr": "Kullanılan Elemanları Listesi",
    "bg": "Списък на използваните елементи",
    "fa": "لیست المان های استفاده شده",
    "ar": "قائمة العناصر المستخدمة",
    "nl": "Lijst van de gebruikte elementen"
  },
  "tbBtnRun": {
    "en": "Run",
    "tr": "Çalıştır",
    "bg": "Старт",
    "fa": "اجرای مدار",
    "ar": "تشغيل",
    "nl": "Beginnen"
  },
  "alertMessage": {
    "en": "Showing print page limits may couse circuit layout delays. It is recommended to hide print page limits when not used.",
    "tr": "Sayfa sınırlarını göstermek çizilen devrenin gosterimini yavaşlatmaktadır. Sayfa sınırlarının ihtiyaç duyulmadıgı zamanlar saklanması önerilmektedir.",
    "bg": "Показване границите на страницата може да се запази. Препоръчва се за се скрие, когато не се използва.",
    "fa": "نشان دادن صفحه محددیت چاپ",
    "ar": "ظهور حدود صفحة الطباعة قد  يؤخر تخطيط الدائر فمن المستحسن  اخفاء حدود الصفحة فى حالة عدم الاستخدام",
    "nl": "Weergegeven print pagina grenzen kan het circuit lay-out vertragen. Het wordt aanbevolen om print pagina grenzen niet te gebruiken"
  }
};

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
  fileType: { tr: 'Kayıt türü', en: 'Save as type' },
  splashNote: { tr: 'EKTS Mobil: masaüstü programın telefon ve tablet uyarlaması. Kapatmak için dokunun.', en: 'EKTS Mobil: the desktop program adapted for phones and tablets. Tap to close.' },
  pages: { tr: 'sayfa', en: 'pages' },
  paper: { tr: 'Kağıt', en: 'Paper' },
  orientation: { tr: 'Yön', en: 'Orientation' },
  portrait: { tr: 'Dikey', en: 'Portrait' },
  landscape: { tr: 'Yatay', en: 'Landscape' },
  printHint: { tr: 'Yazıcı, Yazdır düğmesine basınca açılan pencereden seçilir.', en: 'The printer is chosen in the window that opens when you press Print.' },
  holdHint: {
    tr: 'Düğmeyi basılı bırakmak için parmağınızı yarım saniye tutun (bilgisayardaki sağ tık).',
    en: 'Hold for half a second to latch a button (right click on the desktop).',
  },
};
/** htCaptionsGet: an empty caption shows as "? key", a missing one as the key. */
export function caption(key: string, lang: Lang): string {
  const c = CAPTIONS[key];
  if (c) {
    const s = c[lang];
    return s === '' ? `? ${key}` : s;
  }
  const m = MOBILE[key];
  if (m) return lang === 'tr' ? m.tr : m.en;
  return key;
}
