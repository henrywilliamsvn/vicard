// =============================================================================
// i18n.ts — lightweight English / Vietnamese localization.
// =============================================================================
// Default language is Vietnamese (the app's audience). Toggle is in the header
// and persists on the device. Card product names, bank names and catalog notes
// stay in their original form (proper nouns / reference data).
// =============================================================================
import { useEffect, useState } from "react";
import type { SpendCategory } from "./cards";

export type Lang = "vi" | "en";
const KEY_LANG = "vicard.lang.v1";

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem(KEY_LANG);
      return v === "en" || v === "vi" ? v : "vi";
    } catch {
      return "vi";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY_LANG, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);
  return [lang, setLang];
}

type Entry = { en: string; vi: string };

const DICT = {
  tagline: { en: "Which card to swipe, and when to pay.", vi: "Dùng thẻ nào, và khi nào cần trả." },
  remindersOn: { en: "Reminders on", vi: "Đã bật nhắc" },
  enableReminders: { en: "Enable reminders", vi: "Bật nhắc nhở" },

  tabWallet: { en: "Wallet", vi: "Ví thẻ" },
  tabRewards: { en: "Max rewards", vi: "Tối đa ưu đãi" },
  tabWishlist: { en: "Wishlist", vi: "Muốn mua" },

  paymentsDue: { en: "{n} payment(s) due soon", vi: "{n} khoản sắp đến hạn" },
  dueInDays: { en: "due in {n} day(s)", vi: "còn {n} ngày" },

  thisMonth: { en: "This month", vi: "Tháng này" },
  cashbackEarned: { en: "Cashback earned", vi: "Hoàn tiền đã nhận" },
  topCard: { en: "Top card", vi: "Thẻ dùng nhiều" },
  capLeft: { en: "Cap left", vi: "Hạn mức còn" },

  logPurchase: { en: "Log a purchase", vi: "Ghi nhận chi tiêu" },
  category: { en: "Category", vi: "Danh mục" },
  amount: { en: "Amount", vi: "Số tiền" },
  use: { en: "Use", vi: "Dùng" },
  back: { en: "back", vi: "hoàn lại" },
  alsoStack: { en: "Also stack:", vi: "Cộng thêm:" },
  logPurchaseBtn: { en: "Log purchase", vi: "Lưu chi tiêu" },

  whichCard: { en: "Which card should I use?", vi: "Nên dùng thẻ nào?" },
  addToGetRec: { en: "Add a card below to get a recommendation.", vi: "Thêm thẻ bên dưới để nhận gợi ý." },
  bestCardFor: { en: "Best card for {cat}", vi: "Thẻ tốt nhất cho {cat}" },
  verifiedConfirm: { en: "Verified {d} · confirm on bank site", vi: "Cập nhật {d} · kiểm tra trên web ngân hàng" },
  verified: { en: "Verified {d}", vi: "Cập nhật {d}" },
  howMuchSpend: { en: "How much are you spending? (optional)", vi: "Bạn định chi bao nhiêu? (tuỳ chọn)" },
  youGetBack: { en: "You'll get about {x} back", vi: "Bạn được hoàn khoảng {x}" },
  nearCap: { en: "Heads up: only {x} of this card's cashback cap is left this period.", vi: "Lưu ý: chỉ còn {x} hạn mức hoàn tiền của thẻ này trong kỳ." },
  capExceeded: { en: "This purchase exceeds the remaining cap — extra spend earns the base rate only.", vi: "Khoản này vượt hạn mức còn lại — phần vượt chỉ được hoàn ở mức cơ bản." },
  registerReminder: { en: "Remember to register this category this month to earn the headline rate.", vi: "Nhớ đăng ký danh mục này trong tháng để nhận mức hoàn tiền cao nhất." },
  fxNote: { en: "Note: foreign spend often carries a ~2–3% FX fee that can offset cashback.", vi: "Lưu ý: chi tiêu nước ngoài thường có phí ngoại tệ ~2–3% có thể làm giảm lợi ích hoàn tiền." },
  stackMore: { en: "Stack more cashback before you pay", vi: "Cộng thêm hoàn tiền trước khi trả" },
  noRec: { en: "No recommendation.", vi: "Chưa có gợi ý." },

  myWallet: { en: "My wallet", vi: "Ví của tôi" },
  payNow: { en: "Pay now", vi: "Trả ngay" },
  dueSoon: { en: "Due soon", vi: "Sắp đến hạn" },
  onTrack: { en: "On track", vi: "Đúng hạn" },
  paid: { en: "Paid", vi: "Đã trả" },
  nextDueDay: { en: "next due day {n}", vi: "kỳ tới ngày {n}" },
  dueInDot: { en: "· due in {n} day(s)", vi: "· còn {n} ngày" },
  markAsPaid: { en: "Mark as paid", vi: "Đánh dấu đã trả" },
  cashbackUsedPeriod: { en: "Cashback used this period", vi: "Hoàn tiền đã dùng kỳ này" },
  statementDay: { en: "Statement day", vi: "Ngày sao kê" },
  dueDayLbl: { en: "Due day", vi: "Ngày đến hạn" },
  maxCashback: { en: "Max cashback", vi: "Hoàn tiền tối đa" },
  noCardsYet: { en: "No cards yet.", vi: "Chưa có thẻ nào." },

  welcomeTitle: { en: "👋 Welcome to Ví Thẻ", vi: "👋 Chào mừng đến Ví Thẻ" },
  welcomeBody: { en: "Add the cards you own and we'll tell you which one to swipe for the most cashback — and when each bill is due. Start below.", vi: "Thêm các thẻ bạn có, chúng tôi sẽ mách bạn nên quẹt thẻ nào để hoàn tiền nhiều nhất — và khi nào tới hạn thanh toán. Bắt đầu bên dưới." },
  confirmRemove: { en: "Remove {card} from your wallet? Its dates and cashback settings will be lost.", vi: "Xoá {card} khỏi ví? Ngày tháng và thiết lập hoàn tiền của thẻ sẽ mất." },

  addACard: { en: "Add a card", vi: "Thêm thẻ" },
  tickEvery: { en: "Tick every card you own — add them all at once.", vi: "Chọn các thẻ bạn có — thêm tất cả cùng lúc." },
  apply: { en: "Apply", vi: "Mở thẻ" },
  allAdded: { en: "All catalog cards added.", vi: "Đã thêm hết thẻ trong danh mục." },
  selectToAdd: { en: "Select cards to add", vi: "Chọn thẻ để thêm" },
  addNCards: { en: "Add {n} card(s) to wallet", vi: "Thêm {n} thẻ vào ví" },
  newCardsNote: { en: "New cards start with statement day 1 and due day 15 — adjust each card's dates in your wallet above. Privacy-first: no bank login; everything stays on this device.", vi: "Thẻ mới mặc định ngày sao kê 1 và ngày đến hạn 15 — chỉnh lại trong ví ở trên. Bảo mật trước tiên: không cần đăng nhập ngân hàng; mọi dữ liệu nằm trên thiết bị này." },
  applyAffiliate: { en: "\"Apply\" links are affiliate links — we may earn a commission at no extra cost to you. We rank cards by what's best for you, never by what pays us.", vi: "Liên kết \"Mở thẻ\" là liên kết tiếp thị — chúng tôi có thể nhận hoa hồng mà bạn không tốn thêm phí. Thẻ luôn được xếp theo lợi ích của bạn, không theo hoa hồng." },
  footer: { en: "Reminders only fire while the app is open in your browser. Rates are a June 2026 draft and change often - confirm with your bank. Not financial advice.", vi: "Nhắc nhở chỉ hoạt động khi ứng dụng đang mở. Mức hoàn tiền là bản tháng 6/2026 và thay đổi thường xuyên - hãy kiểm tra với ngân hàng. Không phải tư vấn tài chính." },

  // Rewards hub
  rhLinkTitle: { en: "1 · Link up your rewards", vi: "1 · Kết nối các nguồn ưu đãi" },
  rhLinkSub: { en: "Set these up once. Tick each as you go — then every purchase can stack all of them.", vi: "Thiết lập một lần. Đánh dấu khi xong — sau đó mỗi lần mua đều cộng dồn được tất cả." },
  rhLinked: { en: "Linked", vi: "Đã kết nối" },
  rhAllLinked: { en: "🎉 All linked — you're set to stack on every purchase.", vi: "🎉 Đã kết nối hết — sẵn sàng cộng dồn cho mọi giao dịch." },
  rhStackTitle: { en: "2 · Stack a purchase", vi: "2 · Cộng dồn cho một giao dịch" },
  rhStackSub: { en: "Pick what you're buying — follow the steps in order to layer every discount.", vi: "Chọn món bạn mua — làm theo thứ tự để xếp chồng mọi ưu đãi." },
  rhDealsTitle: { en: "3 · Deals right now", vi: "3 · Ưu đãi đang có" },
  rhDealsSub: { en: "A few deals worth grabbing today. Tap to open the source.", vi: "Vài ưu đãi đáng chú ý hôm nay. Chạm để mở nguồn." },
  open: { en: "Open", vi: "Mở" },
  setUp: { en: "Set up", vi: "Thiết lập" },
  rhPromoNote: { en: "Promo rates change constantly — always check each app's voucher tab before paying. Not financial advice.", vi: "Khuyến mãi thay đổi liên tục — luôn kiểm tra mục voucher của từng app trước khi trả. Không phải tư vấn tài chính." },
  layerPortal: { en: "Cashback portals", vi: "Cổng hoàn tiền" },
  layerVoucher: { en: "Vouchers & coins", vi: "Voucher & xu" },
  layerWallet: { en: "E-wallets", vi: "Ví điện tử" },
  layerCard: { en: "Card", vi: "Thẻ" },

  // Wishlist
  wlTitle: { en: "My wishlist", vi: "Danh sách muốn mua" },
  wlSub: { en: "Add what you want to buy and your target discount. When you open the app, we check today's deals and flag anything that hits your target.", vi: "Thêm món bạn muốn mua và mức giảm mong muốn. Khi bạn mở app, chúng tôi kiểm tra ưu đãi hôm nay và báo món nào đạt mục tiêu." },
  wlMatchBanner: { en: "🎯 {n} deal(s) on your list hit your target right now — see the highlights below.", vi: "🎯 {n} ưu đãi trong danh sách đang đạt mục tiêu — xem phần được tô sáng bên dưới." },
  wlWhatBuy: { en: "What do you want to buy?", vi: "Bạn muốn mua gì?" },
  wlPlaceholder: { en: "e.g. AirPods, hotel in Da Nang…", vi: "vd: AirPods, khách sạn Đà Nẵng…" },
  wlNotifyAt: { en: "Notify at ≥ {n}% off", vi: "Báo khi giảm ≥ {n}%" },
  wlAddBtn: { en: "Add to wishlist", vi: "Thêm vào danh sách" },
  wlNotifyTip: { en: "Tip: tap \"Enable reminders\" in the header to get a pop-up when a deal matches. Notifications only appear while the app is open.", vi: "Mẹo: chạm \"Bật nhắc nhở\" ở đầu trang để nhận thông báo khi có ưu đãi phù hợp. Thông báo chỉ hiện khi app đang mở." },
  wlYourItems: { en: "Your items", vi: "Món của bạn" },
  wlEmpty: { en: "Nothing on your wishlist yet. Add something above.", vi: "Danh sách còn trống. Hãy thêm món ở trên." },
  wlNotifyAtMeta: { en: "notify at ≥ {n}% off", vi: "báo khi giảm ≥ {n}%" },
  wlNoHitYet: { en: "No deal hits {n}% yet — we'll flag it here when one does.", vi: "Chưa có ưu đãi đạt {n}% — sẽ báo ở đây khi có." },
  stepPortalTitle: { en: "Start through a cashback portal", vi: "Bắt đầu qua cổng hoàn tiền" },
  stepPortalDetail: { en: "Open the shop via one of these first — your purchase gets tracked for an extra cashback layer before you've even checked out.", vi: "Mở cửa hàng qua một trong các cổng này trước — giao dịch được ghi nhận để cộng thêm một lớp hoàn tiền trước khi bạn thanh toán." },
  stepVoucherTitle: { en: "Collect & apply vouchers", vi: "Thu thập & áp dụng voucher" },
  stepVoucherDetail: { en: "Grab platform coins and shop vouchers, then apply them at checkout.", vi: "Lấy xu nền tảng và voucher cửa hàng, rồi áp dụng khi thanh toán." },
  stepWalletTitle: { en: "Or pay via an e-wallet promo", vi: "Hoặc trả qua khuyến mãi ví điện tử" },
  stepWalletDetail: { en: "If a wallet promo beats raw card cashback, pay through the wallet (with your card linked) to stack both.", vi: "Nếu khuyến mãi ví tốt hơn hoàn tiền thẻ, hãy trả qua ví (đã liên kết thẻ) để cộng dồn cả hai." },
  stepCardTitle: { en: "Pay with your best card", vi: "Trả bằng thẻ tốt nhất của bạn" },
  stepCardDetail: { en: "Use {card} — your highest cashback card for this category. Check the Wallet tab if its monthly cap is close.", vi: "Dùng {card} — thẻ hoàn tiền cao nhất cho danh mục này. Kiểm tra tab Ví thẻ nếu sắp chạm hạn mức tháng." },
  stepCardDetailGeneric: { en: "Use the highest-cashback card you own for this category (add cards in the Wallet tab to see which).", vi: "Dùng thẻ hoàn tiền cao nhất bạn có cho danh mục này (thêm thẻ ở tab Ví thẻ để xem thẻ nào)." },
  rhDisclosure: { en: "Some links are affiliate links — we may earn a commission at no extra cost to you. We always rank by what's best for you, never by what pays us.", vi: "Một số liên kết là liên kết tiếp thị — chúng tôi có thể nhận hoa hồng mà bạn không tốn thêm phí. Luôn xếp hạng theo lợi ích của bạn, không theo hoa hồng." },
} satisfies Record<string, Entry>;

export type TKey = keyof typeof DICT;

export function t(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = DICT[key][lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp("\\{" + k + "\\}", "g"), String(v));
    }
  }
  return s;
}

const CAT_LABELS: Record<SpendCategory, Entry> = {
  dining: { en: "Dining", vi: "Ăn uống" },
  supermarket: { en: "Supermarket", vi: "Siêu thị" },
  online: { en: "Online", vi: "Trực tuyến" },
  foreign: { en: "Foreign", vi: "Nước ngoài" },
  fuel: { en: "Fuel", vi: "Xăng dầu" },
  travel: { en: "Travel", vi: "Du lịch" },
  education: { en: "Education", vi: "Học phí" },
  entertainment: { en: "Entertainment", vi: "Giải trí" },
  insurance: { en: "Insurance", vi: "Bảo hiểm" },
  everything: { en: "Everything else", vi: "Mọi chi tiêu khác" },
};

export function catLabel(lang: Lang, cat: SpendCategory): string {
  return CAT_LABELS[cat][lang];
}
