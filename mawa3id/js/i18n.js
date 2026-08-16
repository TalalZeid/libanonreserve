// Einfache Zweisprachigkeit (Arabisch / Englisch) ohne Framework.

const translations = {
  ar: {
    site_title: "مواعيد",
    site_tagline: "احجز موعدك مع أي مقدم خدمة في القرية",
    nav_home: "الرئيسية",
    nav_login: "تسجيل الدخول",
    login_title: "تسجيل الدخول",
    login_no_account: "لا يوجد حساب مرتبط بهذا البريد الإلكتروني.",
    featured_badge: "موصى به",
    booking_count_label: "{count} شخص حجزوا هنا",
    recommend_button: "أوصِ به لأصدقائك",
    add_to_calendar: "إضافة إلى التقويم",
    category_all: "الكل",
    search_placeholder: "ابحث عن مقدم خدمة أو فئة...",
    search_did_you_mean: "لا توجد نتائج. هل تقصد:",
    load_more: "عرض المزيد",
    offline_banner: "أنت غير متصل بالإنترنت، هذه بيانات محفوظة من آخر زيارة",
    offline_banner_provider: "أنت غير متصل بالإنترنت، هذه بيانات محفوظة. الحجز يتطلب اتصالاً بالإنترنت.",
    install_banner_title: "ثبّت هذا الموقع كتطبيق",
    install_banner_desc: "وصول أسرع من شاشة هاتفك، يعمل حتى مع إنترنت ضعيف",
    install_button: "تثبيت",
    ios_install_hint: "افتح قائمة المشاركة في المتصفح واختر \"إضافة إلى الشاشة الرئيسية\"",
    loading: "جارٍ التحميل...",
    no_providers: "لا يوجد مقدمو خدمة بعد.",
    provider_book_button: "احجز موعد",
    back_to_list: "رجوع إلى القائمة",
    provider_select_date: "اختر التاريخ",
    provider_select_time: "اختر الوقت",
    provider_no_slots: "لا توجد مواعيد متاحة في هذا اليوم.",
    provider_not_working_day: "مقدم الخدمة لا يعمل في هذا اليوم.",
    provider_form_name: "الاسم الكامل",
    provider_form_phone: "رقم الهاتف",
    provider_form_submit: "تأكيد الحجز",
    provider_selected_slot: "الموعد المختار:",
    provider_booking_success: "تم الحجز بنجاح! اضغط لإرسال تأكيد لمقدم الخدمة عبر واتساب.",
    provider_booking_error: "حدث خطأ أثناء الحجز، حاول مرة أخرى.",
    provider_slot_taken: "للأسف تم حجز هذا الموعد للتو، اختر موعدًا آخر.",
    provider_send_whatsapp: "إرسال التأكيد عبر واتساب",
    provider_cancel_hint: "غيّرت رأيك؟ احتفظ بهذا الرابط لإلغاء الحجز لاحقًا:",
    provider_cancel_link: "إلغاء هذا الحجز",
    provider_cancel_confirm_text: "هل تريد إلغاء هذا الموعد؟",
    provider_cancel_button: "نعم، إلغاء الحجز",
    provider_cancel_success: "تم إلغاء الحجز. أصبح الموعد متاحًا للآخرين.",
    provider_cancel_error: "حدث خطأ أثناء الإلغاء، حاول مرة أخرى.",
    admin_email: "البريد الإلكتروني",
    admin_password: "كلمة المرور",
    admin_login_button: "دخول",
    admin_login_error: "بيانات الدخول غير صحيحة.",
    admin_logout: "تسجيل خروج",
    admin_add_provider_title: "إضافة مقدم خدمة جديد",
    admin_name_ar: "الاسم (عربي)",
    admin_name_en: "الاسم (إنكليزي)",
    admin_category: "الفئة",
    admin_phone: "رقم واتساب (بدون + وبدون مسافات، مثال: 9613xxxxxxx)",
    admin_description_ar: "وصف (عربي)",
    admin_description_en: "وصف (إنكليزي)",
    admin_address: "العنوان",
    admin_working_days: "أيام العمل",
    admin_start_time: "بداية الدوام",
    admin_end_time: "نهاية الدوام",
    admin_slot_minutes: "مدة الموعد (بالدقائق)",
    admin_save_button: "حفظ",
    admin_save_success: "تمت إضافة مقدم الخدمة بنجاح.",
    admin_save_error: "حدث خطأ أثناء الحفظ.",
    admin_providers_list_title: "مقدمو الخدمة المسجلون",
    admin_no_providers_yet: "لا يوجد مقدمو خدمة بعد.",
    admin_edit: "تعديل",
    admin_delete: "حذف",
    admin_delete_confirm: "هل تريد حذف مقدم الخدمة هذا؟ سيتم حذف مواعيده أيضًا.",
    admin_edit_provider_title: "تعديل مقدم الخدمة",
    admin_update_button: "تحديث",
    admin_cancel_edit: "إلغاء التعديل",
    admin_new_provider_button: "مقدم خدمة جديد",
    form_section_basics: "البيانات الأساسية",
    form_section_contact: "التواصل والعنوان",
    form_section_description: "الوصف",
    form_section_hours: "أوقات العمل",
    form_section_login: "دخول صاحب العمل",
    admin_image: "صورة",
    admin_image_dropzone_hint: "اضغط لاختيار صورة",
    admin_location: "الموقع على الخريطة",
    admin_location_hint: "اضغط على الخريطة لتحديد الموقع بدقة",
    admin_location_selected: "الموقع المختار:",
    admin_toggle_new_category: "+ فئة جديدة",
    admin_new_category_name_ar: "اسم الفئة (عربي)",
    admin_new_category_name_en: "اسم الفئة (إنكليزي)",
    admin_add_category_button: "إضافة الفئة",
    admin_owner_email: "بريد دخول صاحب العمل (اختياري)",
    admin_toggle_new_owner: "+ إنشاء حساب دخول جديد لصاحب العمل",
    admin_new_owner_email: "البريد الإلكتروني",
    admin_new_owner_password: "كلمة المرور",
    admin_create_owner_button: "إنشاء الحساب",
    admin_create_owner_success: "تم إنشاء الحساب بنجاح.",
    admin_create_owner_error: "حدث خطأ أثناء إنشاء الحساب.",
    admin_featured_label: "موصى به من الجمعية",
    admin_featured_hint: "يظهر شارة مميزة على صفحة مقدم الخدمة",
    admin_qr_button: "رمز QR",
    admin_qr_download: "تحميل رمز QR",
    stats_total_bookings: "إجمالي الحجوزات",
    stats_this_week: "هذا الأسبوع",
    owner_day_title: "إدارة يوم معيّن",
    owner_close_day_button: "إغلاق هذا اليوم بالكامل",
    owner_reopen_day_button: "إعادة فتح هذا اليوم",
    owner_day_closed_status: "هذا اليوم مغلق بالكامل.",
    owner_slot_free: "متاح",
    owner_block_slot_button: "حجب هذا الموعد",
    owner_slot_blocked_by_you: "محجوب من قبلك",
    owner_unblock_slot_button: "إلغاء الحجب",
    owner_cancel_booking_button: "إلغاء حجز العميل",
    contact_customer: "تواصل عبر واتساب",
    reminder_checkbox_label: "ذكّرني بهذا الموعد قبل ساعة",
    owner_enable_push: "تفعيل إشعارات التطبيق",
    owner_push_enabled: "الإشعارات مفعّلة",
    owner_push_denied: "لم يتم منح إذن الإشعارات. تحقق من إعدادات المتصفح.",
    owner_cancel_booking_confirm: "هل تريد إلغاء حجز هذا العميل؟",
    owner_closed_days_title: "الأيام المغلقة القادمة",
    owner_no_closed_days: "لا توجد أيام مغلقة قادمة.",
    owner_all_appointments_title: "جميع المواعيد",
    owner_no_appointments: "لا توجد مواعيد بعد.",
    weekday_0: "الأحد",
    weekday_1: "الإثنين",
    weekday_2: "الثلاثاء",
    weekday_3: "الأربعاء",
    weekday_4: "الخميس",
    weekday_5: "الجمعة",
    weekday_6: "السبت"
  },
  en: {
    site_title: "Mawa3id",
    site_tagline: "Book an appointment with any service provider in the village",
    nav_home: "Home",
    nav_login: "Login",
    login_title: "Login",
    login_no_account: "No account is linked to this email.",
    featured_badge: "Featured",
    booking_count_label: "{count} people have booked here",
    recommend_button: "Recommend to friends",
    add_to_calendar: "Add to calendar",
    category_all: "All",
    search_placeholder: "Search for a provider or category...",
    search_did_you_mean: "No results found. Did you mean:",
    load_more: "Show more",
    offline_banner: "You're offline — showing saved data from your last visit",
    offline_banner_provider: "You're offline — showing saved data. Booking requires an internet connection.",
    install_banner_title: "Install this site as an app",
    install_banner_desc: "Faster access from your home screen, works even with weak internet",
    install_button: "Install",
    ios_install_hint: "Open the browser's Share menu and choose \"Add to Home Screen\"",
    loading: "Loading...",
    no_providers: "No providers yet.",
    provider_book_button: "Book appointment",
    back_to_list: "Back to list",
    provider_select_date: "Select a date",
    provider_select_time: "Select a time",
    provider_no_slots: "No available slots on this day.",
    provider_not_working_day: "This provider doesn't work on this day.",
    provider_form_name: "Full name",
    provider_form_phone: "Phone number",
    provider_form_submit: "Confirm booking",
    provider_selected_slot: "Selected slot:",
    provider_booking_success: "Booking confirmed! Click to send confirmation to the provider via WhatsApp.",
    provider_booking_error: "Something went wrong, please try again.",
    provider_slot_taken: "Sorry, this slot was just taken. Please choose another.",
    provider_send_whatsapp: "Send confirmation via WhatsApp",
    provider_cancel_hint: "Changed your mind? Keep this link to cancel later:",
    provider_cancel_link: "Cancel this booking",
    provider_cancel_confirm_text: "Do you want to cancel this appointment?",
    provider_cancel_button: "Yes, cancel booking",
    provider_cancel_success: "Booking cancelled. The slot is now free for others.",
    provider_cancel_error: "Something went wrong while cancelling, please try again.",
    admin_email: "Email",
    admin_password: "Password",
    admin_login_button: "Log in",
    admin_login_error: "Invalid login credentials.",
    admin_logout: "Log out",
    admin_add_provider_title: "Add a new provider",
    admin_name_ar: "Name (Arabic)",
    admin_name_en: "Name (English)",
    admin_category: "Category",
    admin_phone: "WhatsApp number (no +, no spaces, e.g. 9613xxxxxxx)",
    admin_description_ar: "Description (Arabic)",
    admin_description_en: "Description (English)",
    admin_address: "Address",
    admin_working_days: "Working days",
    admin_start_time: "Start time",
    admin_end_time: "End time",
    admin_slot_minutes: "Slot length (minutes)",
    admin_save_button: "Save",
    admin_save_success: "Provider added successfully.",
    admin_save_error: "Something went wrong while saving.",
    admin_providers_list_title: "Registered providers",
    admin_no_providers_yet: "No providers yet.",
    admin_edit: "Edit",
    admin_delete: "Delete",
    admin_delete_confirm: "Delete this provider? Their appointments will be deleted too.",
    admin_edit_provider_title: "Edit provider",
    admin_update_button: "Update",
    admin_cancel_edit: "Cancel edit",
    admin_new_provider_button: "New provider",
    form_section_basics: "Basic info",
    form_section_contact: "Contact & address",
    form_section_description: "Description",
    form_section_hours: "Working hours",
    form_section_login: "Provider login",
    admin_image: "Image",
    admin_image_dropzone_hint: "Click to choose an image",
    admin_location: "Location on map",
    admin_location_hint: "Click on the map to set the exact location",
    admin_location_selected: "Selected location:",
    admin_toggle_new_category: "+ New category",
    admin_new_category_name_ar: "Category name (Arabic)",
    admin_new_category_name_en: "Category name (English)",
    admin_add_category_button: "Add category",
    admin_owner_email: "Provider login email (optional)",
    admin_toggle_new_owner: "+ Create a new provider login",
    admin_new_owner_email: "Email",
    admin_new_owner_password: "Password",
    admin_create_owner_button: "Create account",
    admin_create_owner_success: "Account created successfully.",
    admin_create_owner_error: "Something went wrong while creating the account.",
    admin_featured_label: "Recommended by the community",
    admin_featured_hint: "Shows a special badge on the provider's page",
    admin_qr_button: "QR code",
    admin_qr_download: "Download QR code",
    stats_total_bookings: "Total bookings",
    stats_this_week: "This week",
    owner_day_title: "Manage a specific day",
    owner_close_day_button: "Close this day completely",
    owner_reopen_day_button: "Reopen this day",
    owner_day_closed_status: "This day is fully closed.",
    owner_slot_free: "Available",
    owner_block_slot_button: "Block this slot",
    owner_slot_blocked_by_you: "Blocked by you",
    owner_unblock_slot_button: "Unblock",
    owner_cancel_booking_button: "Cancel customer's booking",
    contact_customer: "Message on WhatsApp",
    reminder_checkbox_label: "Remind me about this appointment 1 hour before",
    owner_enable_push: "Enable app notifications",
    owner_push_enabled: "Notifications enabled",
    owner_push_denied: "Notification permission was not granted. Check your browser settings.",
    owner_cancel_booking_confirm: "Cancel this customer's booking?",
    owner_closed_days_title: "Upcoming closed days",
    owner_no_closed_days: "No upcoming closed days.",
    owner_all_appointments_title: "All appointments",
    owner_no_appointments: "No appointments yet.",
    weekday_0: "Sunday",
    weekday_1: "Monday",
    weekday_2: "Tuesday",
    weekday_3: "Wednesday",
    weekday_4: "Thursday",
    weekday_5: "Friday",
    weekday_6: "Saturday"
  }
};

function t(key) {
  const lang = getLang();
  return (translations[lang] && translations[lang][key]) || key;
}

function getLang() {
  return localStorage.getItem("lang") || "ar";
}

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toArabicDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => ARABIC_DIGITS[d]);
}

function formatTime(timeStr) {
  return getLang() === "ar" ? toArabicDigits(timeStr) : timeStr;
}

function setLang(lang) {
  localStorage.setItem("lang", lang);
  applyLang();
}

function applyLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });

  const toggleBtn = document.getElementById("lang-toggle");
  if (toggleBtn) {
    toggleBtn.textContent = lang === "ar" ? "🇬🇧 English" : "🇱🇧 العربية";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyLang();
  const toggleBtn = document.getElementById("lang-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      setLang(getLang() === "ar" ? "en" : "ar");
      if (typeof onLangChange === "function") onLangChange();
    });
  }
});
