// 使い方ガイド。難しい判断は不要にし、流れどおり埋めていけば回るように書く。
// 静的コンテンツのみ（DB接続なし）。

const steps = [
  {
    title: "① 案件の入口（候補→今週のアプローチ先）",
    body: "Uber Eatsの急成長アカウントから抽出された会社は「候補（抽出済）」列に入る。週1回、山路さんがアプローチする先を選んで「今週のアプローチ先」列へ動かす。石田さんは「今週のアプローチ先」列だけ見れば、自分が着手するものが分かる。",
  },
  {
    title: "② ステージを進める（ボードの「→ 次へ」）",
    body: "候補（抽出済）→今週のアプローチ先→アプローチ中→商談設定→商談実施→条件調整→契約→ブランド化→SV案内可能（ゴール）。各ステージに入ると「やることリスト（タスク雛形）」が自動で追加される。必須タスクが全部終わるとカードに「→ 次へ」ボタンが出て、押すと次のステージへ進む。「商談実施」「契約」に進んだ時点でKPIが自動カウントされる（手で数えなくてよい）。",
  },
  {
    title: "③ 契約したら「ブランド化」",
    body: "契約後はブランド化ステージで、PB品の確定調査・代替品探索・ブランド共創・原価とマニュアル・ロイヤリティ確定・SVキックオフを進める（タスクが自動で入る）。全部終わると「SV案内可能」＝SVが加盟店に案内できる状態＝ゴール。",
  },
  {
    title: "④ 見送り・失注のとき",
    body: "時期が合わない会社は「時期見送り」へ（再アプローチ予定日を決めるタスクが自動で入る）。断られたら「失注」へ動かし、理由（提案前NG／提案後NG）を残す。",
  },
  {
    title: "⑤ 商談したらMTGログ",
    body: "「MTG」→記録。オンライン/オフライン・話した要点を残す。商談ではPB品の有無を必ず聞き、案件の「PB品の状態」を更新する。困ったことがあれば場面（PB品／メーカー紹介／価格／契約書）と内容を書く。",
  },
];

const dailyScreens = [
  { name: "ダッシュボード", when: "朝いちばん", what: "今Qの商談・契約の進み具合、次アクションが空の案件、ジャンルの狙い目を確認する" },
  { name: "案件（ボード）", when: "1日中", what: "ステージ別のカンバン。必須タスクを消化して「→ 次へ」で進める。上部に今Qの目標進捗が常に出る" },
  { name: "パートナー", when: "紹介があった時", what: "誰から紹介された／誰に紹介したかを記録する" },
  { name: "MTGログ", when: "打ち合わせの後", what: "話した内容と困ったことを残す" },
];

const tips = [
  {
    title: "ボードの見方",
    body: "「標準／コンパクト」で表示の広さを切り替えられる。時期見送り・失注の列は普段たたんであり、細い帯をクリックすると開く。ジャンルに「済」が付いた案件は、そのジャンルで既に契約があるため優先度低（1ジャンル1契約が基本）。",
  },
  {
    title: "タスク雛形について",
    body: "ステージに入ると標準のやることリストが自動で入る。合わないタスクは完了にせず放置でよい（任意タスクは残っていても進める）。昔からある案件でタスクが空のものは、案件詳細の「雛形から追加」で入れられる。雛形の中身は足し引きできるので、現場に合わない項目があれば山路さん・Toyoさんに伝える。",
  },
  {
    title: "企業規模（大手/中小）",
    body: "取引先ごとに設定する。目安: 直営・FC合計10店舗以上、従業員100名以上、上場（系列含む）のどれかに当てはまれば大手。規模別に商談の進む速さを計測して、営業計画に使う。",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">使い方ガイド</h1>
        <p className="mt-1 text-sm text-slate-500">
          難しく考えず、下の流れどおりに埋めていけば大丈夫です。
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          まず覚えるのはこの4画面だけ
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-400">
                <th className="px-4 py-2 font-medium">画面</th>
                <th className="px-4 py-2 font-medium">いつ見る</th>
                <th className="px-4 py-2 font-medium">何をする</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyScreens.map((s) => (
                <tr key={s.name}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.when}</td>
                  <td className="px-4 py-3 text-slate-600">{s.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          案件を進める基本の流れ
        </h2>
        <div className="space-y-4">
          {steps.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h3 className="font-medium text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          知っておくと便利
        </h2>
        <div className="space-y-4">
          {tips.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h3 className="font-medium text-slate-900">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <h2 className="mb-2 text-sm font-medium text-blue-900">
          山路さんに聞きたい時（ラリーを減らす仕組み）
        </h2>
        <p className="text-sm leading-relaxed text-blue-800">
          一人で判断できないこと（PB品どうする、メーカー紹介いる？等）が出たら、案件やMTGログから「困ったこと」として登録してください。
          「ナレッジ」画面の確認キューに上がり、山路さんが回答すると、次に同じ場面が来たとき案件画面に自動で表示されます。
          使うほど自分で判断できる範囲が広がります。
        </p>
      </section>

      <p className="mt-8 text-xs text-slate-400">
        困ったら画面が真っ白／エラー表示になっても、入力は「あとで直せる」ので、まず埋めることを優先してください。
      </p>
    </div>
  );
}
