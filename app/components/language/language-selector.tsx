"use client";

import { useEffect, useState } from "react";

type Language = "en" | "fa" | "ps";

const STORAGE_KEY = "rayan-language";
const originalText = new WeakMap<Text, string>();

const translations: Record<Exclude<Language, "en">, Record<string, string>> = {
  fa: {
    "Dashboard": "داشبورد", "Vouchers": "اسناد", "Ticket Voucher": "سند تکت", "Visa Voucher": "سند ویزه",
    "Hotel Voucher": "سند هتل", "Package Voucher": "سند پکیج", "Refund Voucher": "سند بازپرداخت",
    "Journal / Cash / Bank": "روزنامه / نقد / بانک", "BSP Settlement": "تسویه BSP", "All Vouchers": "تمام اسناد",
    "Master Data": "داده‌های اصلی", "Customers": "مشتریان", "Suppliers": "تأمین‌کنندگان", "Airlines": "خطوط هوایی",
    "Accounts": "حساب‌ها", "Ledger": "دفتر کل", "Trial Balance": "تراز آزمایشی", "Reports": "گزارش‌ها", "System": "سیستم", "Settings": "تنظیمات",
    "Voucher details": "جزئیات سند", "Voucher No": "شماره سند", "Voucher Date": "تاریخ سند", "Currency ID": "شناسه ارز", "Parties": "طرف‌های معامله",
    "Customer": "مشتری", "Supplier": "تأمین‌کننده", "Airline": "خط هوایی", "Ticket details": "جزئیات تکت", "PNR": "PNR", "Ticket No": "شماره تکت",
    "Passenger Name": "نام مسافر", "Sector From": "مبدأ", "Sector To": "مقصد", "Issue Date": "تاریخ صدور", "Travel Date": "تاریخ سفر",
    "Pricing": "قیمت‌گذاری", "Base Fare": "کرایه پایه", "Tax Amount": "مبلغ مالیات", "Service Charge": "هزینه خدمات", "Commission Amount": "مبلغ کمیشن",
    "Purchase Amount (cost)": "مبلغ خرید (هزینه)", "Exchange Rate": "نرخ تبدیل", "Sale Amount": "مبلغ فروش", "Purchase Amount": "مبلغ خرید", "Profit": "سود",
    "Clear": "پاک کردن", "Post Voucher": "ثبت سند", "Posting…": "در حال ثبت…", "Visa details": "جزئیات ویزه", "Visa Type": "نوع ویزه", "Visa No": "شماره ویزه", "Passport No": "شماره پاسپورت",
    "Stay details": "جزئیات اقامت", "Hotel Name": "نام هتل", "Country ID": "شناسه کشور", "City ID": "شناسه شهر", "Check-in Date": "تاریخ ورود", "Check-out Date": "تاریخ خروج", "Nights": "شب‌ها", "Rooms": "اتاق‌ها", "Adults": "بزرگسالان", "Children": "کودکان", "Room Type": "نوع اتاق", "Selling Amount": "مبلغ فروش",
    "New Ticket Voucher": "سند جدید تکت", "New Visa Voucher": "سند جدید ویزه", "New Hotel Voucher": "سند جدید هتل", "New Package Voucher": "سند جدید پکیج", "New Refund Voucher": "سند جدید بازپرداخت", "New Journal Voucher": "سند جدید روزنامه", "Sign out": "خروج", "Read-Only Mode": "حالت فقط‌خواندنی", "Language": "زبان", "English": "English", "Dari": "دری", "Pashto": "پښتو",
    "Searching…": "در حال جستجو…", "No matches.": "نتیجه‌ای یافت نشد.", "Start typing to search.": "برای جستجو تایپ کنید.", "Try a different search.": "عبارت دیگری را جستجو کنید.",
  },
  ps: {
    "Dashboard": "ډشبورډ", "Vouchers": "اسناد", "Ticket Voucher": "د ټکټ سند", "Visa Voucher": "د ویزې سند",
    "Hotel Voucher": "د هوټل سند", "Package Voucher": "د پکېج سند", "Refund Voucher": "د بېرته ورکړې سند",
    "Journal / Cash / Bank": "ژورنال / نغدې / بانک", "BSP Settlement": "د BSP تصفیه", "All Vouchers": "ټول اسناد",
    "Master Data": "اصلي معلومات", "Customers": "پیرودونکي", "Suppliers": "عرضه کوونکي", "Airlines": "هوايي شرکتونه",
    "Accounts": "حسابونه", "Ledger": "لېجر", "Trial Balance": "ازمایښتي بیلانس", "Reports": "راپورونه", "System": "سیستم", "Settings": "تنظیمات",
    "Voucher details": "د سند جزئیات", "Voucher No": "د سند شمېره", "Voucher Date": "د سند نېټه", "Currency ID": "د اسعارو پېژند", "Parties": "اړخونه",
    "Customer": "پیرودونکی", "Supplier": "عرضه کوونکی", "Airline": "هوايي شرکت", "Ticket details": "د ټکټ جزئیات", "PNR": "PNR", "Ticket No": "د ټکټ شمېره",
    "Passenger Name": "د مسافر نوم", "Sector From": "له", "Sector To": "تر", "Issue Date": "د صادریدو نېټه", "Travel Date": "د سفر نېټه",
    "Pricing": "بیه ټاکنه", "Base Fare": "اصلي کرایه", "Tax Amount": "د مالیې اندازه", "Service Charge": "د خدمت فیس", "Commission Amount": "د کمېشن اندازه",
    "Purchase Amount (cost)": "د پېرود اندازه (لګښت)", "Exchange Rate": "د تبادلې نرخ", "Sale Amount": "د خرڅلاو اندازه", "Purchase Amount": "د پېرود اندازه", "Profit": "ګټه",
    "Clear": "پاکول", "Post Voucher": "سند ثبتول", "Posting…": "ثبتېږي…", "Visa details": "د ویزې جزئیات", "Visa Type": "د ویزې ډول", "Visa No": "د ویزې شمېره", "Passport No": "د پاسپورټ شمېره",
    "Stay details": "د استوګنې جزئیات", "Hotel Name": "د هوټل نوم", "Country ID": "د هېواد پېژند", "City ID": "د ښار پېژند", "Check-in Date": "د ننوتلو نېټه", "Check-out Date": "د وتلو نېټه", "Nights": "شپې", "Rooms": "کوټې", "Adults": "لویان", "Children": "ماشومان", "Room Type": "د کوټې ډول", "Selling Amount": "د خرڅلاو اندازه",
    "New Ticket Voucher": "د ټکټ نوی سند", "New Visa Voucher": "د ویزې نوی سند", "New Hotel Voucher": "د هوټل نوی سند", "New Package Voucher": "د پکېج نوی سند", "New Refund Voucher": "د بېرته ورکړې نوی سند", "New Journal Voucher": "د ژورنال نوی سند", "Sign out": "وتل", "Read-Only Mode": "یوازې د لوستلو حالت", "Language": "ژبه", "English": "English", "Dari": "دری", "Pashto": "پښتو",
    "Searching…": "لټون کېږي…", "No matches.": "هیڅ پایله ونه موندل شوه.", "Start typing to search.": "د لټون لپاره لیکل پیل کړئ.", "Try a different search.": "بله پلټنه وکړئ.",
  },
};

function translateElement(root: HTMLElement, language: Language) {
  const dictionary = language === "en" ? undefined : translations[language];
  const translate = () => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const value = originalText.get(node) ?? node.nodeValue ?? "";
      originalText.set(node, value);
      const trimmed = value.trim();
      const replacement = dictionary?.[trimmed];
      node.nodeValue = replacement ? value.replace(trimmed, replacement) : value;
    }
    root.querySelectorAll<HTMLElement>("[placeholder], [title]").forEach((element) => {
      for (const attribute of ["placeholder", "title"] as const) {
        const value = element.getAttribute(`data-original-${attribute}`) ?? element.getAttribute(attribute);
        if (!value) continue;
        element.setAttribute(`data-original-${attribute}`, value);
        element.setAttribute(attribute, dictionary?.[value] ?? value);
      }
    });
  };
  translate();
  const observer = new MutationObserver(translate);
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export function LanguageSelector() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== "fa" && saved !== "ps") return;
    const timer = window.setTimeout(() => setLanguage(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
    window.localStorage.setItem(STORAGE_KEY, language);
    return translateElement(document.body, language);
  }, [language]);

  return (
    <label className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg" dir="ltr">
      <span className="font-medium text-slate-700">Language</span>
      <select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="bg-transparent outline-none">
        <option value="en">English</option>
        <option value="fa">دری</option>
        <option value="ps">پښتو</option>
      </select>
    </label>
  );
}
