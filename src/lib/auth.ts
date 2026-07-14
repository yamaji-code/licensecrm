// ログイン許可リストの判定。
// - ALLOWED_EMAIL_DOMAINS: ドメイン単位で許可（例: x-kitchen.jp,sugary.jp）
// - ALLOWED_EMAILS:        個別アドレスで許可（例: toyomusic23@gmail.com）
// どちらも未設定なら、セットアップ中のロックアウトを避けるため全許可にフォールバックする。

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();

  const domains = parseList(process.env.ALLOWED_EMAIL_DOMAINS);
  const emails = parseList(process.env.ALLOWED_EMAILS);

  // 許可リストが一切未設定なら全許可（初期セットアップ時の締め出し防止）
  if (domains.length === 0 && emails.length === 0) return true;

  if (emails.includes(e)) return true;

  const domain = e.split("@")[1];
  return domain ? domains.includes(domain) : false;
}
