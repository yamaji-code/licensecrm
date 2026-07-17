// 使い方ガイド。難しい判断は不要にし、流れどおり埋めていけば回るように書く。
// 静的コンテンツのみ（DB接続なし）。

const steps = [
  {
    title: "① 案件を登録する",
    body: "「案件」→「案件を追加」。取引先・案件名・獲得チャネル（顧客紹介／アライアンス紹介／ダイレクト／インバウンド）を選ぶだけ。チャネルは後から変えないので最初の入口で正しく選ぶ。",
  },
  {
    title: "② ステージを進める",
    body: "リスト→選定済→コンタクト中→商談設定→商談実施→検討→契約→稼働。「商談実施」に動かした時点でKPIの商談数が自動でカウントされる（手で数えなくてよい）。見送り・失注になったら理由も残す。",
  },
  {
    title: "③ 次アクションを必ず入れる",
    body: "アクティブな案件は「次に何をするか＋いつまでか」を常に1つ入れておく。空だとダッシュボードに赤で警告が出る。迷ったら「◯日に電話」でもOK。",
  },
  {
    title: "④ 商談したらMTGログ",
    body: "「MTG」→記録。オンライン/オフライン・話した要点を残す。困ったことがあれば場面（PB品／メーカー紹介／価格／契約書）と内容を書く。",
  },
];

const dailyScreens = [
  { name: "ダッシュボード", when: "朝いちばん", what: "今Qの商談・契約の進み具合、次アクションが空の案件を確認する" },
  { name: "案件", when: "1日中", what: "営業先ごとのカード。状態（ステージ）を動かす" },
  { name: "パートナー", when: "紹介があった時", what: "誰から紹介された／誰に紹介したかを記録する" },
  { name: "MTGログ", when: "打ち合わせの後", what: "話した内容と困ったことを残す" },
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
