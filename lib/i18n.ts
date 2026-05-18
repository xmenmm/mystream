'use client';
import { createContext, useContext } from 'react';

export type Locale = 'id' | 'en' | 'jp' | 'ar';

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English',          flag: '🇬🇧' },
  { code: 'jp', label: '日本語',            flag: '🇯🇵' },
  { code: 'ar', label: 'العربية',           flag: '🇸🇦' },
];

type Dict = Record<string, string>;

const ID: Dict = {
  'nav.home': 'Beranda',
  'nav.history': 'Riwayat',
  'nav.dashboard': 'Dashboard',
  'nav.profile': 'Profile',
  'nav.messages': 'Pesan',
  'nav.upload': 'Upload',
  'nav.settings': 'Pengaturan',
  'nav.logout': 'Logout',
  'nav.login': 'Masuk',
  'nav.signup': 'Daftar',
  'nav.search': 'Cari video, user…',
  'nav.notifications': 'Notifikasi',

  'admin.home': 'Admin Home',
  'admin.users': 'Users',
  'admin.tools': 'Tools',
  'admin.banner': 'Banner',
  'admin.activity': 'Aktivitas',
  'admin.announce': 'Pengumuman',
  'admin.top': 'Top',
  'admin.overview': 'Overview',
  'admin.premium_codes': 'Kode Premium',
  'admin.rekening': 'Rekening',

  'btn.upload': 'Upload',
  'btn.cancel': 'Batal',
  'btn.save': 'Simpan',
  'btn.delete': 'Hapus',
  'btn.edit': 'Edit',
  'btn.follow': 'Follow',
  'btn.following': 'Mengikuti',
  'btn.message': 'Pesan',
  'btn.like': 'Suka',
  'btn.share': 'Bagikan',

  'common.loading': 'Memuat…',
  'common.no_videos': 'Belum ada video',
  'common.views': 'tayangan',
  'common.likes': 'suka',
  'common.followers': 'pengikut',
  'common.following': 'diikuti',
  'common.videos': 'video',
};

const EN: Dict = {
  'nav.home': 'Home',
  'nav.history': 'History',
  'nav.dashboard': 'Dashboard',
  'nav.profile': 'Profile',
  'nav.messages': 'Messages',
  'nav.upload': 'Upload',
  'nav.settings': 'Settings',
  'nav.logout': 'Logout',
  'nav.login': 'Sign in',
  'nav.signup': 'Sign up',
  'nav.search': 'Search videos, users…',
  'nav.notifications': 'Notifications',

  'admin.home': 'Admin Home',
  'admin.users': 'Users',
  'admin.tools': 'Tools',
  'admin.banner': 'Banner',
  'admin.activity': 'Activity',
  'admin.announce': 'Announce',
  'admin.top': 'Top',
  'admin.overview': 'Overview',
  'admin.premium_codes': 'Premium Codes',
  'admin.rekening': 'Payment Accounts',

  'btn.upload': 'Upload',
  'btn.cancel': 'Cancel',
  'btn.save': 'Save',
  'btn.delete': 'Delete',
  'btn.edit': 'Edit',
  'btn.follow': 'Follow',
  'btn.following': 'Following',
  'btn.message': 'Message',
  'btn.like': 'Like',
  'btn.share': 'Share',

  'common.loading': 'Loading…',
  'common.no_videos': 'No videos yet',
  'common.views': 'views',
  'common.likes': 'likes',
  'common.followers': 'followers',
  'common.following': 'following',
  'common.videos': 'videos',
};

const JP: Dict = {
  'nav.home': 'ホーム',
  'nav.history': '履歴',
  'nav.dashboard': 'ダッシュボード',
  'nav.profile': 'プロフィール',
  'nav.messages': 'メッセージ',
  'nav.upload': 'アップロード',
  'nav.settings': '設定',
  'nav.logout': 'ログアウト',
  'nav.login': 'ログイン',
  'nav.signup': '登録',
  'nav.search': '動画・ユーザーを検索…',
  'nav.notifications': '通知',

  'admin.home': '管理ホーム',
  'admin.users': 'ユーザー',
  'admin.tools': 'ツール',
  'admin.banner': 'バナー',
  'admin.activity': 'アクティビティ',
  'admin.announce': 'お知らせ',
  'admin.top': 'トップ',
  'admin.overview': '概要',
  'admin.premium_codes': 'プレミアムコード',
  'admin.rekening': '支払い口座',

  'btn.upload': 'アップロード',
  'btn.cancel': 'キャンセル',
  'btn.save': '保存',
  'btn.delete': '削除',
  'btn.edit': '編集',
  'btn.follow': 'フォロー',
  'btn.following': 'フォロー中',
  'btn.message': 'メッセージ',
  'btn.like': 'いいね',
  'btn.share': '共有',

  'common.loading': '読み込み中…',
  'common.no_videos': '動画はまだありません',
  'common.views': '回視聴',
  'common.likes': 'いいね',
  'common.followers': 'フォロワー',
  'common.following': 'フォロー中',
  'common.videos': '動画',
};

const AR: Dict = {
  'nav.home': 'الرئيسية',
  'nav.history': 'السجل',
  'nav.dashboard': 'لوحة التحكم',
  'nav.profile': 'الملف الشخصي',
  'nav.messages': 'الرسائل',
  'nav.upload': 'رفع',
  'nav.settings': 'الإعدادات',
  'nav.logout': 'خروج',
  'nav.login': 'تسجيل الدخول',
  'nav.signup': 'إنشاء حساب',
  'nav.search': 'ابحث عن فيديو أو مستخدم…',
  'nav.notifications': 'الإشعارات',

  'admin.home': 'الرئيسية الإدارية',
  'admin.users': 'المستخدمون',
  'admin.tools': 'الأدوات',
  'admin.banner': 'البانر',
  'admin.activity': 'النشاط',
  'admin.announce': 'الإعلانات',
  'admin.top': 'الأكثر',
  'admin.overview': 'نظرة عامة',
  'admin.premium_codes': 'أكواد البريميوم',
  'admin.rekening': 'حسابات الدفع',

  'btn.upload': 'رفع',
  'btn.cancel': 'إلغاء',
  'btn.save': 'حفظ',
  'btn.delete': 'حذف',
  'btn.edit': 'تعديل',
  'btn.follow': 'متابعة',
  'btn.following': 'تتابع',
  'btn.message': 'رسالة',
  'btn.like': 'إعجاب',
  'btn.share': 'مشاركة',

  'common.loading': 'جار التحميل…',
  'common.no_videos': 'لا توجد فيديوهات بعد',
  'common.views': 'مشاهدات',
  'common.likes': 'إعجابات',
  'common.followers': 'متابعون',
  'common.following': 'يتابع',
  'common.videos': 'فيديوهات',
};

const DICTS: Record<Locale, Dict> = { id: ID, en: EN, jp: JP, ar: AR };

export function isRTL(locale: Locale): boolean {
  return locale === 'ar';
}

export const LocaleContext = createContext<Locale>('id');

export function useT() {
  const locale = useContext(LocaleContext);
  return (key: string): string => DICTS[locale]?.[key] || DICTS.id[key] || key;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
